import { Chess } from 'chess.js';
import type { Classification, ReviewMove, SpecialTag } from '../types';
import {
  DEFAULT_RATING,
  EXPECTED_POINT_BANDS,
  RELATIONAL,
  expectedLoss,
  moverCp,
  moverWinPercent,
  winPercentDrop,
} from './calibration';
import { calibratedErrorClassification, calibratedGreatCandidate, calibratedNonErrorClassification } from './dataCalibratedClassifier';

export { expectedLoss, moverWinPercent } from './calibration';

function mateForMover(mate: number | undefined, color: 'w' | 'b') {
  if (mate == null) return null;
  return color === 'w' ? mate : -mate;
}

export function standardClassification(dropPct: number): Exclude<Classification, 'Brilliant' | 'Great' | 'Best' | 'Book' | 'Miss'> {
  if (dropPct < EXPECTED_POINT_BANDS.excellent) return 'Excellent';
  if (dropPct < EXPECTED_POINT_BANDS.good) return 'Good';
  if (dropPct < EXPECTED_POINT_BANDS.inaccuracy) return 'Inaccuracy';
  if (dropPct < EXPECTED_POINT_BANDS.mistake) return 'Mistake';
  return 'Blunder';
}

function pieceValue(type: string | undefined) {
  return ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[type || ''] ?? 0;
}

/**
 * Conservative board-based sacrifice detector. It deliberately requires a
 * non-pawn piece to be voluntarily exposed to a lower-value capture after the
 * move. This makes Brilliant rare and avoids calling normal equal trades sacs.
 */
export function isSoundSacrificeCandidate(args: {
  fenBefore: string;
  fenAfter: string;
  uci: string;
  color: 'w' | 'b';
  piece: string;
  captured?: string;
}) {
  if (args.piece === 'p' || args.piece === 'k') return false;
  const movedValue = pieceValue(args.piece);
  const capturedValue = pieceValue(args.captured);
  if (movedValue < 3 || capturedValue >= movedValue - 0.5) return false;

  try {
    const after = new Chess(args.fenAfter);
    const to = args.uci.slice(2, 4) as Parameters<Chess['attackers']>[0];
    const attackers = after.attackers(to, args.color === 'w' ? 'b' : 'w');
    if (!attackers.length) return false;
    const cheapestAttacker = Math.min(...attackers.map((sq) => pieceValue(after.get(sq)?.type)));
    if (cheapestAttacker >= movedValue) return false;

    // A sacrifice must have been a choice, not simply a trapped piece being moved.
    const before = new Chess(args.fenBefore);
    const from = args.uci.slice(0, 2);
    const alternatives = before.moves({ verbose: true }).filter((m) => m.from !== from);
    return alternatives.length > 0;
  } catch {
    return false;
  }
}

export interface ClassifyArgs {
  loss: number;
  actualUci: string;
  bestUci: string;
  lines?: unknown[];
  color: 'w' | 'b';
  isBook: boolean;
  fenBefore: string;
  fenAfter: string;
  piece: string;
  captured?: string;
  legalCount: number;
  beforeCp: number;
  afterCp: number;
  beforeMate?: number;
  afterMate?: number;
  rating?: number;
}

/**
 * Context-free classifier used by Practice Mode and as the first stage of a
 * full Game Review. Full PGN review then applies relational Brilliant/Great/
 * Miss rules in applyRelationalClassifications().
 */
export function classifyMove(args: ClassifyArgs): Classification {
  const rating = args.rating ?? DEFAULT_RATING;
  if (args.isBook) return 'Book';
  if (args.legalCount <= 1) return 'Best';

  const isTop = args.actualUci.slice(0, 4) === args.bestUci.slice(0, 4);
  if (isTop) return 'Best';

  const beforeMate = mateForMover(args.beforeMate, args.color);
  const afterMate = mateForMover(args.afterMate, args.color);
  if (beforeMate != null && beforeMate > 0 && (afterMate == null || afterMate <= 0)) return 'Miss';
  if ((beforeMate == null || beforeMate >= 0) && afterMate != null && afterMate < 0) {
    const before = moverCp(args.beforeCp, args.color);
    return before > -RELATIONAL.clearAdvantageCp ? 'Mistake' : 'Blunder';
  }

  return standardClassification(winPercentDrop(args.beforeCp, args.afterCp, args.color, rating));
}

function crossesClearAdvantage(move: ReviewMove) {
  const before = moverCp(move.evalBefore, move.color);
  const after = moverCp(move.evalAfter, move.color);
  const ca = RELATIONAL.clearAdvantageCp;
  return (before >= ca && after < ca) || (before >= -ca && after < -ca);
}

function previousMistakeSignal(move: ReviewMove | undefined) {
  if (!move) return false;
  if (move.standardClassification === 'Blunder' || move.standardClassification === 'Mistake') return true;
  return move.standardClassification === 'Inaccuracy'
    && (move.cpLoss ?? 0) >= RELATIONAL.mistakeMinCpLoss
    && crossesClearAdvantage(move);
}

function opportunityGain(previous: ReviewMove, current: ReviewMove) {
  const rating = current.ratingUsed ?? DEFAULT_RATING;
  const beforeOpp = moverWinPercent(previous.evalBefore, current.color, rating);
  const afterOpp = moverWinPercent(current.evalBefore, current.color, rating);
  return Math.max(0, afterOpp - beforeOpp);
}

/**
 * Analyzer V2 relational pass. The rules intentionally operate on stable raw
 * features from a single Stockfish pass, instead of triggering extra searches.
 */
export function applyRelationalClassifications(moves: ReviewMove[]) {
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const previous = i > 0 ? moves[i - 1] : undefined;
    const previousPrevious = i > 1 ? moves[i - 2] : undefined;
    const rating = move.ratingUsed ?? DEFAULT_RATING;
    const beforeWin = moverWinPercent(move.evalBefore, move.color, rating);
    const afterWin = moverWinPercent(move.evalAfter, move.color, rating);
    const beforeMate = mateForMover(move.beforeMate, move.color);
    const afterMate = mateForMover(move.afterMate, move.color);

    if (move.classification === 'Book') continue;
    if ((move.legalCount ?? 2) <= 1) { move.classification = 'Best'; continue; }

    // Brilliant remains intentionally conservative until the calibration corpus
    // contains exact Brilliant references. This preserves a chess-sound
    // sacrifice rule instead of training a class with zero positive examples.
    const prevMistake = previousMistakeSignal(previous);
    const prevPrevMistake = previousMistakeSignal(previousPrevious);
    if (
      move.isEngineTop
      && move.isSacrifice
      && (move.winPctLoss ?? 99) < RELATIONAL.specialMaxLoss
      && beforeWin < RELATIONAL.brilliantMaxWinBefore
      && afterWin >= RELATIONAL.brilliantMinWinAfter
      && (prevMistake || (!previousMistakeSignal(previous) && prevPrevMistake) || (afterMate != null && afterMate > 0))
    ) {
      move.classification = 'Brilliant';
      continue;
    }

    // Great is a deliberately narrow calibrated rule in V0.3.2. The current
    // corpus has only one exact Great reference, so false positives are more
    // damaging than conservatively returning Best.
    if (calibratedGreatCandidate(move, previous)) {
      move.classification = 'Great';
      continue;
    }

    // Missing a known forced mate is deterministic chess evidence and remains
    // an explicit Miss even before the learned error-family classifier.
    if (beforeMate != null && beforeMate > 0 && (afterMate == null || afterMate <= 0)) {
      move.classification = 'Miss';
      continue;
    }

    // V0.3.2 data-calibrated two-stage model:
    //   1) error-family vs non-error-family gate
    //   2) Inaccuracy/Mistake/Miss/Blunder classifier
    // The model consumes only raw features from the frozen Stockfish pass.
    const errorLabel = calibratedErrorClassification(move, previous);
    move.classification = errorLabel ?? calibratedNonErrorClassification(move);
  }
}

export function specialTags(args: {
  move: ReviewMove;
}) {
  const move = args.move;
  const tags: SpecialTag[] = [];
  const rating = move.ratingUsed ?? DEFAULT_RATING;
  const before = moverWinPercent(move.evalBefore, move.color, rating);
  const after = moverWinPercent(move.evalAfter, move.color, rating);

  if (['Mistake', 'Miss', 'Blunder', 'Great', 'Brilliant'].includes(move.classification)) tags.push('Critical Moment');
  if (move.classification === 'Blunder' || (before >= 70 && after < 45)) tags.push('Major Turning Point');
  if ((move.legalCount ?? 2) <= 1) tags.push('Forced Move');
  if (move.classification === 'Brilliant') tags.push('Winning Sacrifice');
  if (before >= 70 && after < 55 && (move.winPctLoss ?? 0) >= 10) tags.push('Missed Win');

  const bm = mateForMover(move.beforeMate, move.color);
  const am = mateForMover(move.afterMate, move.color);
  if (bm != null && bm > 0 && (am == null || am <= 0)) tags.push('Missed Mate');
  if (move.classification === 'Miss' && !tags.includes('Missed Mate')) tags.push('Missed Tactic');
  return tags;
}
