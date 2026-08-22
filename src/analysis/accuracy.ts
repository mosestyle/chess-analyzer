import type { ReviewMove } from '../types';

export function moveAccuracy(loss: number) {
  return Math.max(0, Math.min(100, 100 * Math.exp(-4.2 * Math.max(0, loss))));
}

export function sideAccuracy(moves: ReviewMove[], color: 'w' | 'b') {
  const relevant = moves.filter((move) => move.color === color);
  if (!relevant.length) return 100;
  const score = relevant.reduce((sum, move) => sum + moveAccuracy(move.expectedLoss), 0) / relevant.length;
  return Math.round(score * 10) / 10;
}

export function phaseAccuracies(moves: ReviewMove[], color: 'w' | 'b') {
  const own = moves.filter((move) => move.color === color);
  const groups = {
    opening: own.filter((move) => move.moveNumber <= 12),
    middlegame: own.filter((move) => move.moveNumber > 12 && move.moveNumber <= 30),
    endgame: own.filter((move) => move.moveNumber > 30),
  };
  const score = (group: ReviewMove[]) => group.length ? Math.round((group.reduce((sum, move) => sum + moveAccuracy(move.expectedLoss), 0) / group.length) * 10) / 10 : null;
  return { opening: score(groups.opening), middlegame: score(groups.middlegame), endgame: score(groups.endgame) };
}
