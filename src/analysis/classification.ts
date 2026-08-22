import type { Classification, EngineLine, SpecialTag } from '../types';
import { movedPieceIsEnPrise } from '../chess/helpers';

const DEFAULT_RATING = 1200;

/**
 * V0.2.3 calibration model.
 *
 * Engine evaluation is converted to expected score with a rating-aware curve.
 * Lower-rated games use a slightly flatter curve because small engine edges are
 * converted less reliably, while stronger players get a steeper curve. The
 * model is intentionally our own approximation rather than a clone of another
 * site's private formula.
 */
export function ratingScale(rating = DEFAULT_RATING) {
  const safe = Math.max(100, Math.min(3000, Number.isFinite(rating) ? rating : DEFAULT_RATING));
  return Math.max(175, Math.min(245, 250 - safe * 0.035));
}

export function whiteExpectedScore(cp: number, rating = DEFAULT_RATING) {
  const bounded = Math.max(-2200, Math.min(2200, cp));
  return 1 / (1 + Math.exp(-bounded / ratingScale(rating)));
}

export function moverExpectedScore(cp: number, color: 'w' | 'b', rating = DEFAULT_RATING) {
  const white = whiteExpectedScore(cp, rating);
  return color === 'w' ? white : 1 - white;
}

export function expectedLoss(beforeCp: number, afterCp: number, color: 'w' | 'b', rating = DEFAULT_RATING) {
  return Math.max(0, moverExpectedScore(beforeCp, color, rating) - moverExpectedScore(afterCp, color, rating));
}

function lineGap(lines: EngineLine[], color: 'w' | 'b', rating = DEFAULT_RATING) {
  if (lines.length < 2) return 0;
  const first = moverExpectedScore(lines[0].scoreCp, color, rating);
  const second = moverExpectedScore(lines[1].scoreCp, color, rating);
  return Math.max(0, first - second);
}

function mateForColor(mate: number | undefined, color: 'w' | 'b') {
  if (!mate) return 0;
  return color === 'w' ? mate : -mate;
}

/** Human-facing expected-loss bands used after Best/Book/special handling. */
export const CLASSIFICATION_BANDS = {
  excellent: 0.012,
  good: 0.055,
  inaccuracy: 0.105,
  mistake: 0.20,
} as const;

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

  // V0.2.2 over-counted Best because any move matching the shallow first-PV
  // bestmove was automatically promoted to Best. At review depth 12 that can be
  // unstable. In V0.2.3 an exact first-PV move still has to preserve essentially
  // all expected score. Forced moves remain Best regardless.
  const confirmedBest = exactEngineChoice && (legalCount <= 1 || loss <= 0.006);

  // Equivalent alternatives may also be called Best, but only with very strong
  // evidence that they are practically indistinguishable. Requiring MultiPV
  // avoids promoting arbitrary shallow alternatives when only one line exists.
  const equivalentBest = !exactEngineChoice
    && lines.length >= 2
    && loss <= 0.0015
    && cpDrift <= 8
    && gap <= 0.012;

  if (confirmedBest || equivalentBest) {
    if (legalCount <= 1) return 'Best';

    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const movedValue = values[piece] || 0;
    const capturedValue = captured ? values[captured] || 0 : 0;
    const destination = actualUci.slice(2, 4);
    const sacrificeLike = movedValue >= 3
      && movedPieceIsEnPrise(fenAfter, destination)
      && capturedValue + 1 < movedValue;
    const beforeExpected = moverExpectedScore(beforeCp, color, rating);
    const afterExpected = moverExpectedScore(afterCp, color, rating);

    if (
      exactEngineChoice
      && sacrificeLike
      && lines.length >= 2
      && gap >= 0.11
      && loss <= 0.004
      && beforeExpected <= 0.90
      && afterExpected >= Math.max(0.50, beforeExpected - 0.008)
    ) return 'Brilliant';

    if (
      exactEngineChoice
      && lines.length >= 2
      && gap >= 0.18
      && beforeExpected >= 0.16
      && beforeExpected <= 0.84
    ) return 'Great';

    return 'Best';
  }

  // A shallow engine choice that drifts materially when the resulting position
  // is searched should be allowed to fall into the normal quality ladder. This
  // is the main V0.2.3 correction for Best inflation without adding expensive
  // deep searches to every position.
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

  const crossedResultBoundary = (before >= 0.72 && after <= 0.48)
    || (before >= 0.56 && after <= 0.30);
  if (args.loss >= 0.13 || crossedResultBoundary || gap >= 0.22) tags.push('Critical Moment');
  if (args.loss >= 0.20 || (before >= 0.80 && after <= 0.34)) tags.push('Major Turning Point');
  if (gap >= 0.22 && args.actualUci === args.bestUci && before >= 0.16 && before <= 0.84) tags.push('Only Move');
  if (args.classification === 'Brilliant') tags.push('Winning Sacrifice');

  if (before >= 0.80 && after < 0.55 && args.loss >= 0.13) tags.push('Missed Win');

  const mateBefore = mateForColor(args.beforeMate ?? args.lines[0]?.mate, args.color);
  const mateAfter = mateForColor(args.afterMate, args.color);
  if (mateBefore > 0 && mateAfter <= 0 && args.actualUci !== args.bestUci) tags.push('Missed Mate');

  return tags;
}
