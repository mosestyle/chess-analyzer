import { Chess } from 'chess.js';
import type { Classification, EngineLine, SpecialTag } from '../types';
import { materialValue, movedPieceIsEnPrise } from '../chess/helpers';

export function whiteExpectedScore(cp: number) {
  const bounded = Math.max(-1500, Math.min(1500, cp));
  return 1 / (1 + Math.exp(-bounded / 240));
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
}): Classification {
  const { loss, actualUci, bestUci, lines, color, isBook, fenBefore, fenAfter, piece, captured } = args;
  if (isBook && loss < 0.02) return 'Book';

  const isBest = actualUci === bestUci;
  if (isBest) {
    const gap = lineGap(lines, color);
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const movedValue = values[piece] || 0;
    const capturedValue = captured ? values[captured] || 0 : 0;
    const before = new Chess(fenBefore);
    const after = new Chess(fenAfter);
    const materialDrop = materialValue(before, color) - materialValue(after, color);
    const destination = actualUci.slice(2, 4);
    const sacrificeLike = movedValue >= 3 && movedPieceIsEnPrise(fenAfter, destination) && (capturedValue < movedValue || materialDrop > 0);
    if (sacrificeLike && gap >= 0.08) return 'Brilliant';
    if (gap >= 0.08) return 'Great';
    return 'Best';
  }

  if (loss < 0.012) return 'Excellent';
  if (loss < 0.035) return 'Good';
  if (loss < 0.075) return 'Inaccuracy';
  if (loss < 0.16) return 'Mistake';
  return 'Blunder';
}

export function specialTags(args: {
  loss: number;
  beforeCp: number;
  afterCp: number;
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

  if (args.loss >= 0.1 || (before >= 0.5 && after < 0.5) || gap >= 0.1) tags.push('Critical Moment');
  if (args.loss >= 0.18) tags.push('Major Turning Point');
  if (gap >= 0.18 && args.actualUci === args.bestUci) tags.push('Only Move');
  if (args.classification === 'Brilliant') tags.push('Winning Sacrifice');
  if (before >= 0.8 && after < 0.6 && args.loss >= 0.12) tags.push('Missed Win');
  if (args.lines[0]?.mate && args.lines[0].mate > 0 && args.actualUci !== args.bestUci) tags.push('Missed Mate');
  return tags;
}
