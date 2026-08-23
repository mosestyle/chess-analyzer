import type { ReviewMove } from '../types';
import { ACCURACY_MODEL, DEFAULT_RATING, clamp, ratingAccuracyMultiplier } from './calibration';
import dataModel from './data-calibrated-model.json';

/**
 * Stable raw move-accuracy layer from Analyzer V2. V0.3.2 keeps this base
 * calculation unchanged, then applies a small game-level calibration model
 * trained only from frozen raw Stockfish features.
 */
export function moveAccuracy(dropPct: number, rating = DEFAULT_RATING) {
  const adjusted = Math.max(0, dropPct) * ratingAccuracyMultiplier(rating);
  const a = ACCURACY_MODEL;
  const raw = a.curveScale * Math.exp(-a.curveDecay * adjusted) + a.curveOffset;
  return clamp(raw, a.scoreFloor, 100);
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

function rawAggregateAccuracy(moves: ReviewMove[]) {
  if (!moves.length) return 100;
  const a = ACCURACY_MODEL;
  const values = moves.map((move) => moveAccuracy(move.winPctLoss ?? move.expectedLoss * 100, move.ratingUsed));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const harmonic = harmonicMean(values);
  const power = powerMean(values, a.powerP, a.powerFloor);
  const badFraction = values.filter((v) => v < a.badMoveThreshold).length / values.length;

  let score = a.meanWeight * mean + a.harmonicWeight * harmonic + a.powerWeight * power;
  score -= Math.max(0, badFraction - a.badFractionGrace) * a.badFractionPenalty;
  return clamp(score, 0, 100);
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  const fraction = index - lo;
  return sorted[lo] * (1 - fraction) + sorted[hi] * fraction;
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

function calibratedAggregateAccuracy(moves: ReviewMove[]) {
  if (!moves.length) return 100;

  const losses = moves.map((move) => Math.max(0, move.winPctLoss ?? move.expectedLoss * 100));
  const base = rawAggregateAccuracy(moves);
  const rating = moves[0]?.ratingUsed ?? DEFAULT_RATING;
  const topFraction = moves.filter((move) => move.isEngineTop).length / moves.length;
  const features: Record<string, number> = {
    current: base,
    meanLoss: losses.reduce((sum, value) => sum + value, 0) / losses.length,
    medianLoss: median(losses),
    p75Loss: percentile(losses, 0.75),
    p90Loss: percentile(losses, 0.9),
    frac5: losses.filter((value) => value >= 5).length / losses.length,
    frac10: losses.filter((value) => value >= 10).length / losses.length,
    frac20: losses.filter((value) => value >= 20).length / losses.length,
    rating,
    n: moves.length,
    topFrac: topFraction,
  };

  const a = dataModel.accuracy;
  let score = a.intercept;
  for (let i = 0; i < a.features.length; i++) {
    const name = a.features[i];
    const value = features[name] ?? 0;
    const scale = a.scale[i] || 1;
    score += ((value - a.mean[i]) / scale) * a.coef[i];
  }
  return clamp(score, a.clampMin, a.clampMax);
}

export function sideAccuracy(moves: ReviewMove[], color: 'w' | 'b') {
  const mine = moves.filter((move) => move.color === color);
  return Math.round(calibratedAggregateAccuracy(mine) * 10) / 10;
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
  const score = (phase: 'opening' | 'middlegame' | 'endgame') => {
    const phaseMoves = mine.filter((move) => phaseForMove(move) === phase);
    return phaseMoves.length ? Math.round(calibratedAggregateAccuracy(phaseMoves) * 10) / 10 : 100;
  };
  return {
    opening: score('opening'),
    middlegame: score('middlegame'),
    endgame: score('endgame'),
  };
}
