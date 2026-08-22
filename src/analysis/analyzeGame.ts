import { Chess } from 'chess.js';
import { engineManager } from '../engine/EngineManager';
import { ANALYSIS_PRESETS } from '../engine/presets';
import type { AnalysisQuality, Classification, EngineAnalysis, EngineMode, GameReview, ReviewMove } from '../types';
import { START_FEN, moveToUci, movedPieceIsEnPrise } from '../chess/helpers';
import { detectOpening, isLikelyBookMove } from '../chess/openings';
import { classifyMove, expectedLoss, moverExpectedScore, specialTags } from './classification';
import { sideAccuracy } from './accuracy';
import { explainMove } from './explanations';

const CLASSIFICATIONS: Classification[] = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Mistake', 'Miss', 'Blunder'];

export interface AnalyzeGameOptions {
  engineMode: EngineMode;
  quality: AnalysisQuality;
  autoFallbackLite?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: { done: number; total: number; stage: string }) => void;
}

function terminalAnalysis(fen: string): EngineAnalysis | null {
  const chess = new Chess(fen);
  if (!chess.isGameOver()) return null;
  let scoreCp = 0;
  let mate: number | undefined;
  if (chess.isCheckmate()) {
    scoreCp = chess.turn() === 'w' ? -100_000 : 100_000;
    mate = chess.turn() === 'w' ? -1 : 1;
  }
  return { fen, depth: 0, bestMove: '(none)', lines: [], scoreCp, mate };
}

function parseRating(value: string | undefined) {
  const rating = Number.parseInt(value || '', 10);
  return Number.isFinite(rating) && rating > 0 ? rating : undefined;
}

function ratingFor(color: 'w' | 'b', whiteElo?: number, blackElo?: number) {
  return color === 'w' ? (whiteElo ?? 1200) : (blackElo ?? 1200);
}

async function analyzePosition(
  fen: string,
  mode: EngineMode,
  quality: AnalysisQuality,
  multiPV = 1,
  depthOverride?: number,
) {
  const terminal = terminalAnalysis(fen);
  if (terminal) return terminal;
  const preset = ANALYSIS_PRESETS[quality];
  const engine = await engineManager.get(mode);
  return engine.analyze(fen, { depth: depthOverride ?? preset.reviewDepth, multiPV, hash: 16 });
}

interface VerifyTarget {
  multiPV: number;
  priority: number;
}

function addVerifyPosition(
  map: Map<number, VerifyTarget>,
  index: number,
  total: number,
  multiPV: number,
  priority: number,
) {
  if (index < 0 || index >= total) return;
  const current = map.get(index);
  map.set(index, {
    multiPV: Math.max(current?.multiPV || 1, multiPV),
    priority: Math.max(current?.priority || 0, priority),
  });
}

function nearClassificationBoundary(loss: number) {
  return [0.02, 0.05, 0.10, 0.20].some((boundary) => Math.abs(loss - boundary) <= 0.012);
}

function coolDown(ms: number) {
  return ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

export async function analyzePgn(pgn: string, options: AnalyzeGameOptions): Promise<GameReview> {
  const parsed = new Chess();
  parsed.loadPgn(pgn, { strict: false });
  const headers = parsed.getHeaders();
  const history = parsed.history({ verbose: true });
  if (!history.length) throw new Error('The PGN does not contain any moves.');

  const whiteElo = parseRating(headers.WhiteElo);
  const blackElo = parseRating(headers.BlackElo);
  const startFen = headers.FEN || START_FEN;
  const replay = new Chess(startFen);
  const moves = history.map((source) => {
    const fenBefore = replay.fen();
    const applied = replay.move(source.san);
    if (!applied) throw new Error(`Could not replay move ${source.san}.`);
    return {
      source: applied,
      fenBefore,
      fenAfter: replay.fen(),
      uci: moveToUci(applied),
    };
  });

  const sans = moves.map((move) => move.source.san);
  const positionFens = [startFen, ...moves.map((move) => move.fenAfter)];
  const analyses: EngineAnalysis[] = [];
  options.onProgress?.({ done: 0, total: positionFens.length, stage: 'Preparing game' });

  let activeMode = options.engineMode;
  try {
    await engineManager.get(activeMode, (percent) => {
      options.onProgress?.({ done: 0, total: positionFens.length, stage: `Loading ${activeMode === 'full' ? 'Full NNUE' : 'Lite'} engine ${Math.round(percent * 100)}%` });
    });
  } catch (error) {
    if (activeMode === 'full' && options.autoFallbackLite) {
      activeMode = 'lite';
      options.onProgress?.({ done: 0, total: positionFens.length, stage: 'Full could not start — loading Lite' });
      await engineManager.switch('lite');
    } else {
      throw error;
    }
  }

  // Pass 1: quick, single-PV evaluation of every position.
  for (let i = 0; i < positionFens.length; i++) {
    if (options.signal?.aborted) {
      await engineManager.get(activeMode).then((engine) => engine.stop()).catch(() => undefined);
      throw new DOMException('Analysis cancelled.', 'AbortError');
    }
    options.onProgress?.({ done: i, total: positionFens.length, stage: `Analyzing position ${i + 1} of ${positionFens.length}` });
    analyses.push(await analyzePosition(positionFens[i], activeMode, options.quality, 1));
  }

  // V0.2.2 thermal-friendly selective verification. The V0.2.1 verifier
  // produced better calibration, but routine Best candidates and broad tactical
  // heuristics could cause a long sequence of depth-17 searches. That kept one
  // CPU core saturated for too long. We now verify only moves likely to change
  // the human-facing label, rank them by importance, cap the total work, and
  // insert a short idle gap between deeper searches.
  const preset = ANALYSIS_PRESETS[options.quality];
  const verifyPositions = new Map<number, VerifyTarget>();
  for (let i = 0; i < moves.length; i++) {
    const color = moves[i].source.color as 'w' | 'b';
    const rating = ratingFor(color, whiteElo, blackElo);
    const before = analyses[i];
    const after = analyses[i + 1];
    const loss = expectedLoss(before.scoreCp, after.scoreCp, color, rating);
    const isBook = i < 28 && isLikelyBookMove(sans, i);
    const isBestCandidate = moves[i].uci === before.bestMove && !isBook;
    const mateCandidate = Boolean(before.mate || after.mate);
    const tacticalCandidate = movedPieceIsEnPrise(moves[i].fenAfter, moves[i].uci.slice(2, 4));
    const legalCount = new Chess(moves[i].fenBefore).moves().length;
    const beforeExpected = moverExpectedScore(before.scoreCp, color, rating);
    const importantError = loss >= 0.10;
    const meaningfulSwing = loss >= 0.045 && Math.abs(before.scoreCp - after.scoreCp) >= 90;
    const boundaryCandidate = !isBook && moves[i].uci !== before.bestMove && nearClassificationBoundary(loss);
    const specialBestCandidate = isBestCandidate
      && beforeExpected >= 0.12
      && beforeExpected <= 0.88
      && (tacticalCandidate || mateCandidate || legalCount <= 4);

    // Mate transitions are always worth checking and receive the highest priority.
    if (mateCandidate) {
      addVerifyPosition(verifyPositions, i, positionFens.length, preset.reviewMultiPV, 100);
      addVerifyPosition(verifyPositions, i + 1, positionFens.length, 1, 98);
      continue;
    }

    // Large practical errors get a same-depth pre/post recheck, but do not need
    // expensive MultiPV unless they also sit near a classification boundary.
    if (importantError) {
      addVerifyPosition(verifyPositions, i, positionFens.length, boundaryCandidate ? preset.reviewMultiPV : 1, 82 + Math.min(12, loss * 40));
      addVerifyPosition(verifyPositions, i + 1, positionFens.length, 1, 80 + Math.min(12, loss * 40));
    } else if (boundaryCandidate || meaningfulSwing) {
      addVerifyPosition(verifyPositions, i, positionFens.length, boundaryCandidate ? preset.reviewMultiPV : 1, 66);
      addVerifyPosition(verifyPositions, i + 1, positionFens.length, 1, 64);
    }

    // Routine Best moves are no longer all re-searched. Only plausible
    // Great/Brilliant/Only-Move candidates get a deeper MultiPV comparison.
    if (specialBestCandidate) {
      addVerifyPosition(verifyPositions, i, positionFens.length, preset.reviewMultiPV, tacticalCandidate ? 76 : 70);
    }
  }

  const verifyList = [...verifyPositions.entries()]
    .sort((a, b) => b[1].priority - a[1].priority || a[0] - b[0])
    .slice(0, preset.reviewVerifyLimit);

  for (let n = 0; n < verifyList.length; n++) {
    if (options.signal?.aborted) {
      await engineManager.get(activeMode).then((engine) => engine.stop()).catch(() => undefined);
      throw new DOMException('Analysis cancelled.', 'AbortError');
    }
    const [positionIndex, target] = verifyList[n];
    options.onProgress?.({
      done: positionFens.length - 1,
      total: positionFens.length,
      stage: `Verifying key position ${n + 1} of ${verifyList.length}`,
    });
    analyses[positionIndex] = await analyzePosition(
      positionFens[positionIndex],
      activeMode,
      options.quality,
      target.multiPV,
      preset.reviewVerifyDepth,
    );
    if (n + 1 < verifyList.length) await coolDown(preset.reviewVerifyPauseMs);
  }

  const reviewMoves: ReviewMove[] = moves.map((move, index) => {
    const before = analyses[index];
    const after = analyses[index + 1];
    const color = move.source.color as 'w' | 'b';
    const rating = ratingFor(color, whiteElo, blackElo);
    const loss = expectedLoss(before.scoreCp, after.scoreCp, color, rating);
    const bestMove = before.bestMove;
    const legalCount = new Chess(move.fenBefore).moves().length;
    const isBook = index < 28 && isLikelyBookMove(sans, index);
    const classification = classifyMove({
      loss,
      actualUci: move.uci,
      bestUci: bestMove,
      lines: before.lines,
      color,
      isBook,
      fenBefore: move.fenBefore,
      fenAfter: move.fenAfter,
      piece: move.source.piece,
      captured: move.source.captured,
      legalCount,
      beforeCp: before.scoreCp,
      afterCp: after.scoreCp,
      rating,
    });
    const tags = specialTags({
      loss,
      beforeCp: before.scoreCp,
      afterCp: after.scoreCp,
      beforeMate: before.mate,
      afterMate: after.mate,
      color,
      lines: before.lines,
      bestUci: bestMove,
      actualUci: move.uci,
      classification,
      rating,
    });
    if (legalCount === 1 && !tags.includes('Forced Move')) tags.push('Forced Move');
    if (['Mistake', 'Blunder'].includes(classification) && movedPieceIsEnPrise(move.fenAfter, move.uci.slice(2, 4)) && !tags.includes('Hanging Piece')) tags.push('Hanging Piece');
    const review: ReviewMove = {
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      color,
      san: move.source.san,
      uci: move.uci,
      fenBefore: move.fenBefore,
      fenAfter: move.fenAfter,
      evalBefore: before.scoreCp,
      evalAfter: after.scoreCp,
      expectedLoss: loss,
      bestMove,
      bestLine: before.lines[0]?.pv || [],
      alternatives: before.lines,
      classification,
      tags,
      explanation: '',
    };
    review.explanation = explainMove({
      classification: review.classification,
      tags: review.tags,
      san: review.san,
      bestMove: review.bestMove,
      fenBefore: review.fenBefore,
      fenAfter: review.fenAfter,
      beforeCp: review.evalBefore,
      afterCp: review.evalAfter,
      replyLine: after.lines[0]?.pv || [],
    });
    return review;
  });

  // A Miss requires a real opportunity created by the opponent and a meaningful
  // failure to cash it in. The Full-NNUE calibration games showed V0.2 slightly
  // under-counted Misses, so V0.2.1 keys off the opportunity swing itself rather
  // than requiring the preceding move to have already received Mistake/Blunder.
  for (let i = 1; i < reviewMoves.length; i++) {
    const previous = reviewMoves[i - 1];
    const current = reviewMoves[i];
    const rating = ratingFor(current.color, whiteElo, blackElo);
    const beforeOpponentMove = moverExpectedScore(previous.evalBefore, current.color, rating);
    const afterOpponentMove = moverExpectedScore(current.evalBefore, current.color, rating);
    const opportunityGain = Math.max(0, afterOpponentMove - beforeOpponentMove);
    const meaningfulOpportunity = opportunityGain >= 0.075;
    const gaveBackEnough = current.expectedLoss >= 0.06
      && current.expectedLoss >= Math.min(0.10, opportunityGain * 0.45);

    if (
      meaningfulOpportunity
      && gaveBackEnough
      && ['Inaccuracy', 'Mistake', 'Blunder'].includes(current.classification)
      && !current.tags.includes('Missed Mate')
    ) {
      current.classification = 'Miss';
      if (!current.tags.includes('Missed Tactic')) current.tags.push('Missed Tactic');
      current.explanation = explainMove({
        classification: 'Miss',
        tags: current.tags,
        san: current.san,
        bestMove: current.bestMove,
        fenBefore: current.fenBefore,
        fenAfter: current.fenAfter,
        beforeCp: current.evalBefore,
        afterCp: current.evalAfter,
        replyLine: analyses[i + 1].lines[0]?.pv || [],
      });
    }
  }

  const emptyCounts = () => Object.fromEntries(CLASSIFICATIONS.map((name) => [name, 0])) as Record<Classification, number>;
  const counts = { white: emptyCounts(), black: emptyCounts() };
  for (const move of reviewMoves) counts[move.color === 'w' ? 'white' : 'black'][move.classification] += 1;

  options.onProgress?.({ done: positionFens.length, total: positionFens.length, stage: 'Building review' });

  return {
    pgn,
    startFen,
    whiteName: headers.White || 'White',
    blackName: headers.Black || 'Black',
    whiteElo,
    blackElo,
    eco: headers.ECO,
    opening: detectOpening(sans, headers),
    engineMode: activeMode,
    analysisQuality: options.quality,
    moves: reviewMoves,
    whiteAccuracy: sideAccuracy(reviewMoves, 'w'),
    blackAccuracy: sideAccuracy(reviewMoves, 'b'),
    counts,
  };
}
