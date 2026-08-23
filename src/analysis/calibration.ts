/**
 * Analyzer Engine V2 calibration constants.
 *
 * These values are an independent implementation informed by Chess.com's
 * published Expected Points thresholds and by studying open-source calibration
 * techniques. No Chess.com or Chess-Review source code is copied here.
 *
 * The important V0.3 change is architectural: engine measurements are frozen,
 * classifications consume stable win-probability/cp features, and Accuracy is
 * computed from those same features. Do not casually change these constants;
 * tune them only against the regression dataset.
 */

export const ANALYZER_MODEL_VERSION = 'v2.0';
export const DEFAULT_RATING = 1200;

// Central eval -> win-probability slope. Rating modifies this modestly because
// Chess.com publicly states its Expected Points model varies with player rating.
const BASE_WIN_K = 0.00315;

export const EXPECTED_POINT_BANDS = {
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 20,
} as const; // percentage points of win probability lost

export const RELATIONAL = {
  clearAdvantageCp: 200,
  mistakeMinCpLoss: 120,
  missToleranceCp: 50,
  missMinOpportunityGain: 5.0,
  brilliantMaxWinBefore: 88,
  brilliantMinWinAfter: 48,
  greatMinOpportunityGain: 12,
} as const;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function winKForRating(rating = DEFAULT_RATING) {
  const r = clamp(Number.isFinite(rating) ? rating : DEFAULT_RATING, 100, 3000);
  // Lower-rated positions use a slightly flatter curve; stronger-player games
  // get a slightly steeper one. Keep the range narrow so ratings do not swamp
  // the engine evaluation itself.
  const factor = clamp(0.86 + r / 9000, 0.87, 1.12);
  return BASE_WIN_K * factor;
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
  // Accuracy and move classifications are separate. This gentle multiplier is
  // only for CAPS2-like display scoring: at lower ratings, a given win-probability
  // drop contributes a little more to the game score, matching our reference set.
  return clamp(1 + (1900 - r) * 0.00012, 0.84, 1.24);
}
