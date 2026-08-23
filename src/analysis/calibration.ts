import model from './calibration-model.json';

/**
 * Analyzer Engine V2 calibration model.
 *
 * V0.3.2 keeps the frozen expected-points parameters in calibration-model.json while the
 * data-calibrated classifier lives in a separate generated model. The
 * browser never reads Chess.com NAGs as answers; labelled PGNs are only used
 * by development/export tooling.
 */

export const CALIBRATION_MODEL = model;
export const ANALYZER_MODEL_VERSION = model.modelVersion;
export const DEFAULT_RATING = 1200;

export const EXPECTED_POINT_BANDS = model.bands;
export const RELATIONAL = model.relational;
export const ACCURACY_MODEL = model.accuracy;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function winKForRating(rating = DEFAULT_RATING) {
  const r = clamp(Number.isFinite(rating) ? rating : DEFAULT_RATING, 100, 3000);
  const p = model.expectedPoints;
  const factor = clamp(
    p.ratingIntercept + r / p.ratingDivisor,
    p.ratingFactorMin,
    p.ratingFactorMax,
  );
  return p.baseWinK * factor;
}

export function whiteWinPercent(cp: number, rating = DEFAULT_RATING) {
  const bounded = clamp(cp, -10_000, 10_000);
  return 100 / (1 + Math.exp(-winKForRating(rating) * bounded));
}

export function moverWinPercent(cp: number, color: 'w' | 'b', rating = DEFAULT_RATING) {
  const white = whiteWinPercent(cp, rating);
  return color === 'w' ? white : 100 - white;
}

export function winPercentDrop(beforeCp: number, afterCp: number, color: 'w' | 'b', rating = DEFAULT_RATING) {
  return Math.max(0, moverWinPercent(beforeCp, color, rating) - moverWinPercent(afterCp, color, rating));
}

/** Backwards-compatible 0..1 expected-points loss used by UI/graph code. */
export function expectedLoss(beforeCp: number, afterCp: number, color: 'w' | 'b', rating = DEFAULT_RATING) {
  return winPercentDrop(beforeCp, afterCp, color, rating) / 100;
}

export function moverCp(cp: number, color: 'w' | 'b') {
  return color === 'w' ? cp : -cp;
}

export function ratingAccuracyMultiplier(rating = DEFAULT_RATING) {
  const r = clamp(Number.isFinite(rating) ? rating : DEFAULT_RATING, 100, 3000);
  const a = model.accuracy;
  return clamp(
    1 + (a.ratingReference - r) * a.ratingSlope,
    a.multiplierMin,
    a.multiplierMax,
  );
}
