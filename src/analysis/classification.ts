import { Chess } from 'chess.js';
import type { Classification, EngineLine, SpecialTag } from '../types';
import { movedPieceIsEnPrise } from '../chess/helpers';

/**
 * Convert a white-perspective centipawn score into an intuitive expected-score
 * estimate. This is deliberately our own smooth model; it is not intended to
 * reproduce any other site's private accuracy formula.
 */
export function whiteExpectedScore(cp: number) {
  const bounded = Math.max(-1800, Math.min(1800, cp));
  return 1 / (1 + Math.exp(-bounded / 235));
}

export function moverExpectedScore(cp: number, color: 'w' | 'b') {
  const white = whiteExpectedScore(cp);
  return color === 'w' ? white : 1 - white;
}

export function expectedLoss(beforeCp: number, afterCp: number, color: 'w' | 'b') {
  return Math.max(0, moverExpectedScore(beforeCp, color) - moverExpectedScore(afterCp, color));
}

function lineGap(lines: EngineLine[], color: 'w' | 'b') {
  if (lines.length < 2) return 0;
  const first = moverExpectedScore(lines[0].scoreCp, color);
  const second = moverExpectedScore(lines[1].scoreCp, color);
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
}): Classification {
  const {
    loss, actualUci, bestUci, lines, color, isBook, fenAfter,
    piece, captured, legalCount, beforeCp, afterCp,
  } = args;

  if (isBook && loss <= 0.02) return 'Book';

  const isBest = actualUci === bestUci;
  if (isBest) {
    // A forced move can be best, but it should not be promoted to Great simply
    // because every alternative is illegal.
    if (legalCount <= 1) return 'Best';

    const gap = lineGap(lines, color);
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const movedValue = values[piece] || 0;
    const capturedValue = captured ? values[captured] || 0 : 0;
    const destination = actualUci.slice(2, 4);
    const sacrificeLike = movedValue >= 3
      && movedPieceIsEnPrise(fenAfter, destination)
      && capturedValue + 1 < movedValue;
    const beforeExpected = moverExpectedScore(beforeCp, color);
    const afterExpected = moverExpectedScore(afterCp, color);

    // Brilliant is intentionally rare: the move must be the engine's first
    // choice, accept a meaningful apparent material risk, preserve the result,
    // and be notably better than the main alternative.
    if (
      sacrificeLike
      && gap >= 0.06
      && loss <= 0.006
      && afterExpected >= Math.max(0.48, beforeExpected - 0.01)
    ) return 'Brilliant';

    // Great is reserved for a genuinely important unique-ish best move.
    if (gap >= 0.12) return 'Great';
    return 'Best';
  }

  // V0.2 uses expected-score loss bands. The wider separation makes labels
  // less jumpy at different centipawn scales and makes a Blunder represent a
  // truly large loss of winning/drawing chances.
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
}) {
  const tags: SpecialTag[] = [];
  const before = moverExpectedScore(args.beforeCp, args.color);
  const after = moverExpectedScore(args.afterCp, args.color);
  const gap = lineGap(args.lines, args.color);

  const crossedResultBoundary = (before >= 0.62 && after <= 0.48)
    || (before >= 0.48 && after <= 0.35);
  if (args.loss >= 0.10 || crossedResultBoundary || gap >= 0.15) tags.push('Critical Moment');
  if (args.loss >= 0.20 || (before >= 0.70 && after <= 0.40)) tags.push('Major Turning Point');
  if (gap >= 0.18 && args.actualUci === args.bestUci) tags.push('Only Move');
  if (args.classification === 'Brilliant') tags.push('Winning Sacrifice');

  if (before >= 0.80 && after < 0.60 && args.loss >= 0.12) tags.push('Missed Win');

  // Mate scores are normalized to White in the engine layer. Convert them back
  // to the mover's perspective so missed mates work for both White and Black.
  const mateBefore = mateForColor(args.beforeMate ?? args.lines[0]?.mate, args.color);
  const mateAfter = mateForColor(args.afterMate, args.color);
  if (mateBefore > 0 && mateAfter <= 0 && args.actualUci !== args.bestUci) tags.push('Missed Mate');

  return tags;
}
