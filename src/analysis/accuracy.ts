import type { ReviewMove } from '../types';
import { DEFAULT_RATING, clamp, ratingAccuracyMultiplier } from './calibration';

/**
 * Stable CAPS2-like scoring layer for Analyzer Engine V2.
 * Accuracy is derived from raw win-probability loss, not from the displayed
 * category. This prevents changing Miss/Great labels from moving game Accuracy.
 */
export function moveAccuracy(dropPct: number, rating = DEFAULT_RATING) {
  const adjusted = Math.max(0, dropPct) * ratingAccuracyMultiplier(rating);
  // Smooth school-grade-like curve: 0 loss -> 100; medium drops fall quickly;
  // severe drops approach zero without a hard category-dependent cliff.
  const raw = 102.8 * Math.exp(-0.056 * adjusted) - 2.8;
  return clamp(raw, 0.5, 100);
}

function harmonicMean(values: number[]) {
  const safe = values.map((v) => Math.max(1, v));
  return safe.length / safe.reduce((sum, value) => sum + 1 / value, 0);
}

function powerMean(values: number[], p: number, floor = 4) {
  if (!values.length) return 100;
  const safe = values.map((v) => Math.max(floor, v));
  const avg = safe.reduce((sum, value) => sum + Math.pow(value, p), 0) / safe.length;
  return Math.pow(avg, 1 / p);
}

function aggregateAccuracy(moves: ReviewMove[]) {
  if (!moves.length) return 100;
  const values = moves.map((move) => moveAccuracy(move.winPctLoss ?? move.expectedLoss * 100, move.ratingUsed));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const harmonic = harmonicMean(values);
  const power = powerMean(values, -1.55, 5);
  const badFraction = values.filter((v) => v < 50).length / values.length;

  // A robust blend: quiet 100s cannot completely hide repeated bad moves, while
  // one isolated tactical disaster does not reduce an otherwise clean game to 0.
  let score = 0.28 * mean + 0.32 * harmonic + 0.40 * power;
  score -= Math.max(0, badFraction - 0.10) * 10;
  return Math.round(clamp(score, 0, 100) * 10) / 10;
}

export function sideAccuracy(moves: ReviewMove[], color: 'w' | 'b') {
  return aggregateAccuracy(moves.filter((move) => move.color === color));
}

function phaseForMove(move: ReviewMove) {
  try {
    const board = move.fenAfter.split(' ')[0];
    const queens = (board.match(/[qQ]/g) || []).length;
    const nonPawn = (board.match(/[rRbBnN]/g) || []).length;
    if (move.moveNumber <= 10 && queens >= 1) return 'opening';
    if (queens === 0 || nonPawn <= 6 || move.moveNumber >= 32) return 'endgame';
  } catch {
    // Fall through to middlegame.
  }
  return 'middlegame';
}

export function phaseAccuracies(moves: ReviewMove[], color: 'w' | 'b') {
  const mine = moves.filter((move) => move.color === color);
  return {
    opening: aggregateAccuracy(mine.filter((move) => phaseForMove(move) === 'opening')),
    middlegame: aggregateAccuracy(mine.filter((move) => phaseForMove(move) === 'middlegame')),
    endgame: aggregateAccuracy(mine.filter((move) => phaseForMove(move) === 'endgame')),
  };
}
