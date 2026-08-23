import type { Classification, EngineLine, SpecialTag } from '../types';
import { movedPieceIsEnPrise } from '../chess/helpers';

const DEFAULT_RATING = 1200;
const BASE_WIN_CURVE = 0.00368208;

/**
 * V0.2.4: Chess.com-style expected-points approximation.
 *
 * Chess.com publicly documents the move-classification bands as expected-points
 * loss (0.02 / 0.05 / 0.10 / 0.20) and states that the evaluation-to-expected-
 * points conversion varies with player rating. The exact fitted rating model is
 * not public, so we use the widely used 0.00368208 logistic curve as the center
 * and make it deliberately flatter for lower-rated players and a little steeper
 * for stronger players.
 *
 * This keeps the public thresholds intact instead of trying to "fix" results by
 * moving the category boundaries around from release to release.
 */
export function winCurveForRating(rating = DEFAULT_RATING) {
  const safe = Math.max(100, Math.min(3000, Number.isFinite(rating) ? rating : DEFAULT_RATING));
  const factor = Math.max(0.82, Math.min(1.08, 0.80 + safe / 10_000));
  return BASE_WIN_CURVE * factor;
}

export function whiteExpectedScore(cp: number, rating = DEFAULT_RATING) {
  const bounded = Math.max(-2400, Math.min(2400, cp));
  return 1 / (1 + Math.exp(-winCurveForRating(rating) * bounded));
}

export function moverExpectedScore(cp: number, color: 'w' | 'b', rating = DEFAULT_RATING) {
  const white = whiteExpectedScore(cp, rating);
  return color === 'w' ? white : 1 - white;
}

export function expectedLoss(beforeCp: number, afterCp: number, color: 'w' | 'b', rating = DEFAULT_RATING) {
  return Math.max(0, moverExpectedScore(beforeCp, color, rating) - moverExpectedScore(afterCp, color, rating));
}

/** Public Chess.com Classification V2 expected-points bands. */
export const CLASSIFICATION_BANDS = {
  excellent: 0.02,
  good: 0.05,
  inaccuracy: 0.10,
  mistake: 0.20,
} as const;

export function winningExpectedThreshold(rating = DEFAULT_RATING) {
  const safe = Math.max(100, Math.min(3000, Number.isFinite(rating) ? rating : DEFAULT_RATING));
  // Lower-rated games require a little less expected score before an opportunity
  // is treated as practically winning; stronger games require a little more.
  return Math.max(0.67, Math.min(0.74, 0.675 + safe / 45_000));
}

function lineGap(lines: EngineLine[], color: 'w' | 'b', rating = DEFAULT_RATING) {
  if (lines.length < 2) return 0;
  const first = moverExpectedScore(lines[0].scoreCp, color, rating);
  const second = moverExpectedScore(lines[1].scoreCp, color, rating);
  return Math.max(0, first - second);
}

function uniqueMoveThreshold(rating = DEFAULT_RATING) {
  const safe = Math.max(100, Math.min(3000, rating));
  return Math.max(0.135, Math.min(0.19, 0.13 + safe / 30_000));
}

function mateForColor(mate: number | undefined, color: 'w' | 'b') {
  if (!mate) return 0;
  return color === 'w' ? mate : -mate;
}

export function classifyMove(args: {
  loss: number;
  actualUci: string;
  bestUci: string;
  lines: EngineLine[];
  color: 'w' | 'b';
  isBook: boolean;
  fenBefore: string;
  fenAfter: string;
  piece: string;
  captured?: string;
  legalCount: number;
  beforeCp: number;
  afterCp: number;
  rating?: number;
}): Classification {
  const {
    loss, actualUci, bestUci, lines, color, isBook, fenAfter,
    piece, captured, legalCount, beforeCp, afterCp, rating = DEFAULT_RATING,
  } = args;

  if (isBook) return 'Book';

  const exactEngineChoice = actualUci === bestUci;
  const cpDrift = Math.abs(beforeCp - afterCp);
  const gap = lineGap(lines, color, rating);
  const beforeExpected = moverExpectedScore(beforeCp, color, rating);
  const afterExpected = moverExpectedScore(afterCp, color, rating);

  // A depth-12 first PV can occasionally disagree with the independently
  // searched resulting position. V0.2.2 called every shallow first-PV match
  // Best; V0.2.3 was too strict. This middle ground keeps an exact engine choice
  // as Best unless the follow-up search disagrees by more than a small amount.
  const confirmedBest = exactEngineChoice && (legalCount <= 1 || loss <= 0.012);
  const equivalentBest = !exactEngineChoice
    && lines.length >= 2
    && loss <= 0.0025
    && cpDrift <= 12
    && gap <= 0.012;
  const topMove = confirmedBest || equivalentBest;

  if (topMove) {
    if (legalCount <= 1) return 'Best';

    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const movedValue = values[piece] || 0;
    const capturedValue = captured ? values[captured] || 0 : 0;
    const destination = actualUci.slice(2, 4);
    const sacrificeLike = movedValue >= 3
      && movedPieceIsEnPrise(fenAfter, destination)
      && capturedValue + (rating < 800 ? 0.5 : 1) < movedValue;

    // Brilliant: best/nearly-best, a genuine piece sacrifice, not losing after
    // the move, and not already trivially won beforehand. Lower-rated players
    // get a slightly wider practical allowance, matching Chess.com's published
    // description without attempting to clone unpublished internals.
    const brilliantLossAllowance = rating < 800 ? 0.012 : 0.008;
    if (
      sacrificeLike
      && loss <= brilliantLossAllowance
      && afterExpected >= 0.46
      && beforeExpected <= 0.90
    ) return 'Brilliant';

    // Great: a move that changes the practical result, or the only clearly good
    // move. Unlike V0.2.x gap-only logic, this explicitly models losing->equal
    // and equal->winning transitions described by Chess.com.
    const win = winningExpectedThreshold(rating);
    const rescuesLoss = beforeExpected <= 0.36 && afterExpected >= 0.47;
    const createsWin = beforeExpected < win && afterExpected >= win;
    const onlyGoodMove = exactEngineChoice
      && lines.length >= 2
      && gap >= uniqueMoveThreshold(rating)
      && beforeExpected >= 0.12
      && beforeExpected <= 0.88;
    if (rescuesLoss || createsWin || onlyGoodMove) return 'Great';

    return 'Best';
  }

  // Keep the public Classification V2 boundaries exactly. The calibration work
  // now happens in the expected-points conversion and the special categories,
  // not by inventing different category cutoffs.
  if (loss <= CLASSIFICATION_BANDS.excellent) return 'Excellent';
  if (loss <= CLASSIFICATION_BANDS.good) return 'Good';
  if (loss <= CLASSIFICATION_BANDS.inaccuracy) return 'Inaccuracy';
  if (loss <= CLASSIFICATION_BANDS.mistake) return 'Mistake';
  return 'Blunder';
}

export function specialTags(args: {
  loss: number;
  beforeCp: number;
  afterCp: number;
  beforeMate?: number;
  afterMate?: number;
  color: 'w' | 'b';
  lines: EngineLine[];
  bestUci: string;
  actualUci: string;
  classification: Classification;
  rating?: number;
}) {
  const tags: SpecialTag[] = [];
  const rating = args.rating ?? DEFAULT_RATING;
  const before = moverExpectedScore(args.beforeCp, args.color, rating);
  const after = moverExpectedScore(args.afterCp, args.color, rating);
  const gap = lineGap(args.lines, args.color, rating);
  const win = winningExpectedThreshold(rating);

  const crossedResultBoundary = (before >= win && after < 0.55)
    || (before >= 0.48 && before <= 0.60 && after <= 0.34);
  if (args.loss >= 0.11 || crossedResultBoundary || gap >= 0.20) tags.push('Critical Moment');
  if (args.loss >= 0.20 || (before >= win && after <= 0.36)) tags.push('Major Turning Point');
  if (gap >= uniqueMoveThreshold(rating) && args.actualUci === args.bestUci && before >= 0.12 && before <= 0.88) tags.push('Only Move');
  if (args.classification === 'Brilliant') tags.push('Winning Sacrifice');

  if (before >= win && after < 0.55 && args.loss >= 0.10) tags.push('Missed Win');

  const mateBefore = mateForColor(args.beforeMate ?? args.lines[0]?.mate, args.color);
  const mateAfter = mateForColor(args.afterMate, args.color);
  if (mateBefore > 0 && mateAfter <= 0 && args.actualUci !== args.bestUci) tags.push('Missed Mate');

  return tags;
}
