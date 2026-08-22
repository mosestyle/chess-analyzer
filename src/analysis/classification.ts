import type { Classification, EngineLine, SpecialTag } from '../types';
import { movedPieceIsEnPrise } from '../chess/helpers';

const DEFAULT_RATING = 1200;

/**
 * V0.2.1 calibration model.
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

  // Book is an opening-theory label, not an engine-quality bucket. Once the
  // local opening path recognizes the move, keep the Book label even if the
  // engine slightly prefers another continuation.
  if (isBook) return 'Book';

  const isBest = actualUci === bestUci;
  const cpDrift = Math.abs(beforeCp - afterCp);

  // At practical search depths several moves can be essentially equivalent.
  // Treat a numerically indistinguishable move as Best rather than flooding the
  // review with Excellent labels just because Stockfish returned another first
  // PV at that exact depth.
  const equivalentBest = !isBest && loss <= 0.0035 && cpDrift <= 18;
  if (isBest || equivalentBest) {
    if (legalCount <= 1) return 'Best';

    const gap = lineGap(lines, color, rating);
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const movedValue = values[piece] || 0;
    const capturedValue = captured ? values[captured] || 0 : 0;
    const destination = actualUci.slice(2, 4);
    const sacrificeLike = movedValue >= 3
      && movedPieceIsEnPrise(fenAfter, destination)
      && capturedValue + 1 < movedValue;
    const beforeExpected = moverExpectedScore(beforeCp, color, rating);
    const afterExpected = moverExpectedScore(afterCp, color, rating);

    // Brilliant stays deliberately rare. In addition to being effectively the
    // best move, it must accept a real material risk and have a clear uniqueness
    // signal from the engine.
    if (
      isBest
      && sacrificeLike
      && gap >= 0.10
      && loss <= 0.004
      && beforeExpected <= 0.90
      && afterExpected >= Math.max(0.50, beforeExpected - 0.008)
    ) return 'Brilliant';

    // Great requires a genuinely important unique best move in a position where
    // the result is still meaningfully in play. This avoids awarding Great for
    // routine conversions in positions that are already completely decided.
    if (
      isBest
      && gap >= 0.16
      && beforeExpected >= 0.15
      && beforeExpected <= 0.85
    ) return 'Great';

    return 'Best';
  }

  // Expected-points loss bands intentionally follow the intuitive V2-style
  // ladder used by the product spec. The rating-aware expected score and deeper
  // verification pass are what make these bands more stable in V0.2.1.
  if (loss <= 0.02) return 'Excellent';
  if (loss <= 0.05) return 'Good';
  if (loss <= 0.10) return 'Inaccuracy';
  if (loss <= 0.20) return 'Mistake';
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

  const crossedResultBoundary = (before >= 0.68 && after <= 0.50)
    || (before >= 0.52 && after <= 0.34);
  if (args.loss >= 0.085 || crossedResultBoundary || gap >= 0.18) tags.push('Critical Moment');
  if (args.loss >= 0.19 || (before >= 0.76 && after <= 0.38)) tags.push('Major Turning Point');
  if (gap >= 0.20 && args.actualUci === args.bestUci && before >= 0.15 && before <= 0.85) tags.push('Only Move');
  if (args.classification === 'Brilliant') tags.push('Winning Sacrifice');

  if (before >= 0.78 && after < 0.58 && args.loss >= 0.12) tags.push('Missed Win');

  const mateBefore = mateForColor(args.beforeMate ?? args.lines[0]?.mate, args.color);
  const mateAfter = mateForColor(args.afterMate, args.color);
  if (mateBefore > 0 && mateAfter <= 0 && args.actualUci !== args.bestUci) tags.push('Missed Mate');

  return tags;
}
