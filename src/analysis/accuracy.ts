import type { ReviewMove } from '../types';

/**
 * V0.2 accuracy is an original expected-score based metric. Tiny losses stay
 * close to 100 while large mistakes are penalized progressively more strongly.
 */
export function moveAccuracy(loss: number) {
  const x = Math.max(0, Math.min(1, loss));
  const score = 100 * Math.exp(-(2.45 * x + 10.5 * x * x));
  return Math.max(0, Math.min(100, score));
}

export function sideAccuracy(moves: ReviewMove[], color: 'w' | 'b') {
  const relevant = moves.filter((move) => move.color === color);
  if (!relevant.length) return 100;

  // Average move quality, with a small extra emphasis on the worst quarter of
  // moves so one or two genuine collapses are not completely hidden in a long
  // game while still avoiding an excessively harsh single-blunder score.
  const accuracies = relevant.map((move) => moveAccuracy(move.expectedLoss));
  const mean = accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length;
  const sorted = [...accuracies].sort((a, b) => a - b);
  const worstCount = Math.max(1, Math.ceil(sorted.length / 4));
  const worstQuarter = sorted.slice(0, worstCount).reduce((sum, value) => sum + value, 0) / worstCount;
  const score = mean * 0.88 + worstQuarter * 0.12;
  return Math.round(score * 10) / 10;
}

function phaseForMove(move: ReviewMove) {
  try {
    // Phase detection from the actual board is more useful than a fixed move-30
    // cutoff. Queens and remaining non-pawn material are enough for a compact
    // local heuristic.
    const board = move.fenAfter.split(' ')[0];
    const queens = (board.match(/[qQ]/g) || []).length;
    const nonPawn = (board.match(/[rRbBnN]/g) || []).length;
    if (move.moveNumber <= 10 && nonPawn >= 10) return 'opening' as const;
    if (queens === 0 && nonPawn <= 6) return 'endgame' as const;
    if (move.moveNumber >= 32 && nonPawn <= 8) return 'endgame' as const;
    return 'middlegame' as const;
  } catch {
    if (move.moveNumber <= 12) return 'opening' as const;
    if (move.moveNumber > 30) return 'endgame' as const;
    return 'middlegame' as const;
  }
}

export function phaseAccuracies(moves: ReviewMove[], color: 'w' | 'b') {
  const own = moves.filter((move) => move.color === color);
  const groups = {
    opening: own.filter((move) => phaseForMove(move) === 'opening'),
    middlegame: own.filter((move) => phaseForMove(move) === 'middlegame'),
    endgame: own.filter((move) => phaseForMove(move) === 'endgame'),
  };
  const score = (group: ReviewMove[]) => {
    if (!group.length) return null;
    const value = group.reduce((sum, move) => sum + moveAccuracy(move.expectedLoss), 0) / group.length;
    return Math.round(value * 10) / 10;
  };
  return { opening: score(groups.opening), middlegame: score(groups.middlegame), endgame: score(groups.endgame) };
}
