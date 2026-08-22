import type { Classification, ReviewMove } from '../types';

const CLASS_CAP: Record<Classification, number> = {
  Brilliant: 100,
  Great: 100,
  Best: 100,
  Book: 100,
  Excellent: 94,
  Good: 82,
  Inaccuracy: 58,
  Mistake: 34,
  Miss: 20,
  Blunder: 7,
};

/**
 * Convert expected-points loss into a move-level score. V0.2.1 is deliberately
 * more punitive than V0.2 for medium and large errors; an arithmetic mean made
 * long games look unrealistically accurate even after several collapses.
 */
export function moveAccuracy(loss: number, classification?: Classification) {
  if (classification && ['Brilliant', 'Great', 'Best', 'Book'].includes(classification)) return 100;
  const x = Math.max(0, Math.min(1, loss));
  const raw = 100 * Math.exp(-(3.6 * x + 21 * x * x));
  const capped = classification ? Math.min(raw, CLASS_CAP[classification]) : raw;
  return Math.max(0.5, Math.min(100, capped));
}

function aggregateAccuracy(moves: ReviewMove[]) {
  if (!moves.length) return 100;
  const values = moves.map((move) => moveAccuracy(move.expectedLoss, move.classification));
  const arithmetic = values.reduce((sum, value) => sum + value, 0) / values.length;
  const geometric = Math.exp(values.reduce((sum, value) => sum + Math.log(Math.max(0.5, value)), 0) / values.length);

  // Geometric averaging makes repeated serious errors matter instead of being
  // washed out by many forced or trivial 100-point moves. A small arithmetic
  // component keeps one isolated blunder from dominating an otherwise clean game.
  const blended = geometric * 0.68 + arithmetic * 0.32;
  return Math.round(Math.max(0, Math.min(100, blended)) * 10) / 10;
}

export function sideAccuracy(moves: ReviewMove[], color: 'w' | 'b') {
  return aggregateAccuracy(moves.filter((move) => move.color === color));
}

function phaseForMove(move: ReviewMove) {
  try {
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
  const score = (group: ReviewMove[]) => group.length ? aggregateAccuracy(group) : null;
  return { opening: score(groups.opening), middlegame: score(groups.middlegame), endgame: score(groups.endgame) };
}
