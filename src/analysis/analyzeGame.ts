import { Chess } from 'chess.js';
import { engineManager } from '../engine/EngineManager';
import { ANALYSIS_PRESETS } from '../engine/presets';
import type { AnalysisQuality, Classification, EngineAnalysis, EngineMode, GameReview, ReviewMove } from '../types';
import { START_FEN, moveToUci, movedPieceIsEnPrise } from '../chess/helpers';
import { detectOpening, isLikelyBookMove } from '../chess/openings';
import {
  applyRelationalClassifications,
  classifyMove,
  isSoundSacrificeCandidate,
  specialTags,
  standardClassification,
} from './classification';
import { expectedLoss, moverCp, moverWinPercent, winPercentDrop } from './calibration';
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

function sleep(ms: number) {
  return ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

async function analyzeReviewPosition(
  fen: string,
  mode: EngineMode,
  quality: AnalysisQuality,
) {
  const terminal = terminalAnalysis(fen);
  if (terminal) return terminal;
  const preset = ANALYSIS_PRESETS[quality];
  const engine = await engineManager.get(mode);
  return engine.analyze(fen, {
    nodes: preset.reviewNodes,
    multiPV: preset.reviewMultiPV,
    hash: 16,
  });
}

function criticalPriority(move: ReviewMove) {
  const classWeight: Partial<Record<Classification, number>> = {
    Brilliant: 92,
    Great: 78,
    Inaccuracy: 34,
    Mistake: 58,
    Miss: 70,
    Blunder: 90,
  };
  let score = (classWeight[move.classification] || 0) + (move.winPctLoss ?? move.expectedLoss * 100) * 2.1;
  if (move.tags.includes('Major Turning Point')) score += 38;
  if (move.tags.includes('Missed Mate')) score += 55;
  if (move.tags.includes('Missed Win')) score += 22;
  return score;
}

function trimCriticalMoments(moves: ReviewMove[]) {
  const limit = Math.max(3, Math.min(8, Math.ceil(moves.length / 18)));
  const candidates = moves
    .map((move, index) => ({ move, index, score: criticalPriority(move) }))
    .filter(({ move, score }) => move.tags.includes('Critical Moment') || score >= 62)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit);

  const keep = new Set(candidates.map(({ index }) => index));
  moves.forEach((move, index) => {
    const hadCritical = move.tags.includes('Critical Moment');
    if (hadCritical && !keep.has(index)) move.tags = move.tags.filter((tag) => tag !== 'Critical Moment');
    if (!hadCritical && keep.has(index)) move.tags.push('Critical Moment');
  });
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
  options.onProgress?.({ done: 0, total: positionFens.length, stage: 'Preparing Analyzer V2' });

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

  // Analyzer Engine V2: one frozen, reproducible Stockfish measurement pass.
  // There is intentionally no second verification or re-analysis stage.
  const preset = ANALYSIS_PRESETS[options.quality];
  for (let i = 0; i < positionFens.length; i++) {
    if (options.signal?.aborted) {
      await engineManager.get(activeMode).then((engine) => engine.stop()).catch(() => undefined);
      throw new DOMException('Analysis cancelled.', 'AbortError');
    }
    options.onProgress?.({
      done: i,
      total: positionFens.length,
      stage: `Analyzing position ${i + 1} of ${positionFens.length}`,
    });
    analyses.push(await analyzeReviewPosition(positionFens[i], activeMode, options.quality));
    if (i + 1 < positionFens.length) await sleep(preset.reviewPauseMs);
  }

  const reviewMoves: ReviewMove[] = moves.map((move, index) => {
    const before = analyses[index];
    const after = analyses[index + 1];
    const color = move.source.color as 'w' | 'b';
    const rating = ratingFor(color, whiteElo, blackElo);
    const dropPct = winPercentDrop(before.scoreCp, after.scoreCp, color, rating);
    const loss = expectedLoss(before.scoreCp, after.scoreCp, color, rating);
    const cpLoss = Math.max(0, moverCp(before.scoreCp, color) - moverCp(after.scoreCp, color));
    const legalCount = new Chess(move.fenBefore).moves().length;
    const isBook = index < 28 && isLikelyBookMove(sans, index);
    const isEngineTop = move.uci.slice(0, 4) === before.bestMove.slice(0, 4);
    const standard = standardClassification(dropPct);
    const classification = classifyMove({
      loss,
      actualUci: move.uci,
      bestUci: before.bestMove,
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
      beforeMate: before.mate,
      afterMate: after.mate,
      rating,
    });

    return {
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
      winPctLoss: dropPct,
      winPctBefore: moverWinPercent(before.scoreCp, color, rating),
      winPctAfter: moverWinPercent(after.scoreCp, color, rating),
      cpLoss,
      isEngineTop,
      isBook,
      legalCount,
      isSacrifice: isSoundSacrificeCandidate({
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        uci: move.uci,
        color,
        piece: move.source.piece,
        captured: move.source.captured,
      }),
      ratingUsed: rating,
      standardClassification: standard,
      beforeMate: before.mate,
      afterMate: after.mate,
      bestMove: before.bestMove,
      bestLine: before.lines[0]?.pv || [],
      alternatives: before.lines,
      classification,
      tags: [],
      explanation: '',
    } satisfies ReviewMove;
  });

  // Special categories are relational and deliberately applied only after every
  // move has stable raw features. This is the key V0.3 architecture change.
  applyRelationalClassifications(reviewMoves);

  reviewMoves.forEach((review, index) => {
    review.tags = specialTags({ move: review });
    if (['Mistake', 'Blunder'].includes(review.classification)
      && movedPieceIsEnPrise(review.fenAfter, review.uci.slice(2, 4))
      && !review.tags.includes('Hanging Piece')) review.tags.push('Hanging Piece');

    review.explanation = explainMove({
      classification: review.classification,
      tags: review.tags,
      san: review.san,
      bestMove: review.bestMove,
      fenBefore: review.fenBefore,
      fenAfter: review.fenAfter,
      beforeCp: review.evalBefore,
      afterCp: review.evalAfter,
      replyLine: analyses[index + 1].lines[0]?.pv || [],
    });
  });

  trimCriticalMoments(reviewMoves);

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
