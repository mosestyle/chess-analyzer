import { Chess } from 'chess.js';
import { engineManager } from '../engine/EngineManager';
import { ANALYSIS_PRESETS } from '../engine/presets';
import type { AnalysisQuality, Classification, EngineAnalysis, EngineMode, GameReview, ReviewMove } from '../types';
import { START_FEN, moveToUci, movedPieceIsEnPrise } from '../chess/helpers';
import { detectOpening, isLikelyBookMove } from '../chess/openings';
import { classifyMove, expectedLoss, specialTags } from './classification';
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

async function analyzePosition(fen: string, mode: EngineMode, quality: AnalysisQuality) {
  const terminal = terminalAnalysis(fen);
  if (terminal) return terminal;
  const preset = ANALYSIS_PRESETS[quality];
  const engine = await engineManager.get(mode);
  return engine.analyze(fen, { depth: preset.depth, multiPV: preset.multiPV, hash: 32 });
}


export async function analyzePgn(pgn: string, options: AnalyzeGameOptions): Promise<GameReview> {
  const parsed = new Chess();
  parsed.loadPgn(pgn, { strict: false });
  const headers = parsed.getHeaders();
  const history = parsed.history({ verbose: true });
  if (!history.length) throw new Error('The PGN does not contain any moves.');

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

  for (let i = 0; i < positionFens.length; i++) {
    if (options.signal?.aborted) {
      await engineManager.get(activeMode).then((engine) => engine.stop()).catch(() => undefined);
      throw new DOMException('Analysis cancelled.', 'AbortError');
    }
    options.onProgress?.({ done: i, total: positionFens.length, stage: `Analyzing position ${i + 1} of ${positionFens.length}` });
    analyses.push(await analyzePosition(positionFens[i], activeMode, options.quality));
  }

  const sans = moves.map((move) => move.source.san);
  const reviewMoves: ReviewMove[] = moves.map((move, index) => {
    const before = analyses[index];
    const after = analyses[index + 1];
    const color = move.source.color as 'w' | 'b';
    const loss = expectedLoss(before.scoreCp, after.scoreCp, color);
    const bestMove = before.bestMove;
    const classification = classifyMove({
      loss,
      actualUci: move.uci,
      bestUci: bestMove,
      lines: before.lines,
      color,
      isBook: index < 18 && isLikelyBookMove(sans, index),
      fenBefore: move.fenBefore,
      fenAfter: move.fenAfter,
      piece: move.source.piece,
      captured: move.source.captured,
    });
    const tags = specialTags({
      loss,
      beforeCp: before.scoreCp,
      afterCp: after.scoreCp,
      color,
      lines: before.lines,
      bestUci: bestMove,
      actualUci: move.uci,
      classification,
    });
    const legalCount = new Chess(move.fenBefore).moves().length;
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
      beforeCp: review.evalBefore,
      afterCp: review.evalAfter,
    });
    return review;
  });

  // A "Miss" is an error immediately after the opponent handed over a meaningful opportunity.
  for (let i = 1; i < reviewMoves.length; i++) {
    const previous = reviewMoves[i - 1];
    const current = reviewMoves[i];
    const opponentErrored = ['Mistake', 'Blunder'].includes(previous.classification);
    if (opponentErrored && current.expectedLoss >= 0.06 && ['Inaccuracy', 'Mistake'].includes(current.classification)) {
      current.classification = 'Miss';
      if (!current.tags.includes('Missed Tactic')) current.tags.push('Missed Tactic');
      current.explanation = explainMove({
        classification: 'Miss',
        tags: current.tags,
        san: current.san,
        bestMove: current.bestMove,
        fenBefore: current.fenBefore,
        beforeCp: current.evalBefore,
        afterCp: current.evalAfter,
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
    opening: detectOpening(sans),
    moves: reviewMoves,
    whiteAccuracy: sideAccuracy(reviewMoves, 'w'),
    blackAccuracy: sideAccuracy(reviewMoves, 'b'),
    counts,
  };
}
