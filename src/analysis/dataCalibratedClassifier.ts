import type { Classification, ReviewMove } from '../types';
import model from './data-calibrated-model.json';
import { DEFAULT_RATING, clamp, moverWinPercent } from './calibration';

type ErrorClassification = Extract<Classification, 'Inaccuracy' | 'Mistake' | 'Miss' | 'Blunder'>;

type ForestNode =
  | { p: number[] }
  | { f: number; t: number; l: number; r: number };

interface ForestModel {
  classes: string[];
  trees: ForestNode[][];
}

interface FeatureContext {
  values: Record<string, number>;
  opportunityGain: number;
}

function mateForMover(mate: number | undefined, color: 'w' | 'b') {
  if (mate == null) return null;
  return color === 'w' ? mate : -mate;
}

function leafProbabilities(tree: ForestNode[], features: number[]) {
  let index = 0;
  for (;;) {
    const node = tree[index];
    if ('p' in node) return node.p;
    index = features[node.f] <= node.t ? node.l : node.r;
  }
}

function forestProbabilities(forest: ForestModel, features: number[]) {
  const totals = new Array(forest.classes.length).fill(0) as number[];
  for (const tree of forest.trees) {
    const probs = leafProbabilities(tree, features);
    for (let i = 0; i < totals.length; i++) totals[i] += probs[i] ?? 0;
  }
  const divisor = Math.max(1, forest.trees.length);
  return totals.map((value) => value / divisor);
}

function forestLabel(forest: ForestModel, features: number[]) {
  const probabilities = forestProbabilities(forest, features);
  let best = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[best]) best = i;
  }
  return { label: forest.classes[best], probabilities };
}

function featureContext(move: ReviewMove, previous?: ReviewMove): FeatureContext {
  const rating = move.ratingUsed ?? DEFAULT_RATING;
  const winLoss = Math.max(0, move.winPctLoss ?? move.expectedLoss * 100);
  const cpLoss = Math.max(0, move.cpLoss ?? 0);
  const previousWinLoss = Math.max(0, previous?.winPctLoss ?? (previous?.expectedLoss ?? 0) * 100);
  const previousCpLoss = Math.max(0, previous?.cpLoss ?? 0);
  const beforeWin = move.winPctBefore ?? moverWinPercent(move.evalBefore, move.color, rating);
  const afterWin = move.winPctAfter ?? moverWinPercent(move.evalAfter, move.color, rating);
  const beforePrevious = previous
    ? moverWinPercent(previous.evalBefore, move.color, rating)
    : beforeWin;
  const opportunityGain = previous ? Math.max(0, beforeWin - beforePrevious) : 0;
  const beforeMate = mateForMover(move.beforeMate, move.color);
  const afterMate = mateForMover(move.afterMate, move.color);

  return {
    opportunityGain,
    values: {
      winLossCap: clamp(winLoss, 0, 70),
      logCpLoss: Math.log1p(clamp(cpLoss, 0, 5000)),
      beforeWin,
      afterWin,
      rating,
      is_top: move.isEngineTop ? 1 : 0,
      legal: move.legalCount ?? 0,
      oppGainCap: clamp(opportunityGain, 0, 70),
      prevWinCap: clamp(previousWinLoss, 0, 60),
      logPrevCp: Math.log1p(clamp(previousCpLoss, 0, 5000)),
      mateBeforeWin: beforeMate != null && beforeMate > 0 ? 1 : 0,
      mateAfterLose: afterMate != null && afterMate < 0 ? 1 : 0,
      lossToOppRatio: winLoss / (opportunityGain + 2),
      moveNum: move.moveNumber,
    },
  };
}

function vectorFor(names: string[], values: Record<string, number>) {
  return names.map((name) => values[name] ?? 0);
}

/**
 * Returns a data-calibrated error-family label or null when the gate says the
 * move belongs to the non-error family (Best/Excellent/Good). Book and forced
 * moves are handled by the caller.
 */
export function calibratedErrorClassification(move: ReviewMove, previous?: ReviewMove): ErrorClassification | null {
  const context = featureContext(move, previous);
  const gateForest = model.gateForest as ForestModel;
  const gateVector = vectorFor(model.features.gate, context.values);
  const gate = forestLabel(gateForest, gateVector);
  const errorIndex = gateForest.classes.indexOf('1');
  if (errorIndex < 0 || gate.probabilities[errorIndex] <= 0.5) return null;

  const errorForest = model.errorForest as ForestModel;
  const errorVector = vectorFor(model.features.errorClass, context.values);
  return forestLabel(errorForest, errorVector).label as ErrorClassification;
}

export function calibratedNonErrorClassification(move: ReviewMove): Extract<Classification, 'Best' | 'Excellent' | 'Good'> {
  const loss = Math.max(0, move.winPctLoss ?? move.expectedLoss * 100);
  const thresholds = model.nonError;
  if ((move.legalCount ?? 2) <= 1) return 'Best';
  if ((move.isEngineTop && loss <= thresholds.bestTopMaxLoss) || loss <= thresholds.bestEquivalentMaxLoss) return 'Best';
  if (loss < thresholds.excellentMaxLoss) return 'Excellent';
  return 'Good';
}

/**
 * V0.3.2 keeps Great intentionally conservative because the current exact
 * calibration corpus contains only one Great reference. This rule is stored in
 * the generated model so future corpora can replace it without touching the
 * Stockfish measurement layer.
 */
export function calibratedGreatCandidate(move: ReviewMove, previous?: ReviewMove) {
  const g = model.special.great;
  if (!g.enabled) return false;
  const { opportunityGain } = featureContext(move, previous);
  const rating = move.ratingUsed ?? DEFAULT_RATING;
  const beforeWin = move.winPctBefore ?? moverWinPercent(move.evalBefore, move.color, rating);
  const loss = Math.max(0, move.winPctLoss ?? move.expectedLoss * 100);
  const afterMate = mateForMover(move.afterMate, move.color);

  return (!g.requireEngineTop || Boolean(move.isEngineTop))
    && afterMate == null
    && opportunityGain >= g.opportunityGainMin
    && opportunityGain <= g.opportunityGainMax
    && beforeWin >= g.beforeWinMin
    && beforeWin <= g.beforeWinMax
    && loss < g.maxLoss
    && (!g.requireNoSacrifice || !move.isSacrifice);
}

export const DATA_CALIBRATED_MODEL_VERSION = model.modelVersion;
export const DATA_CALIBRATED_BENCHMARKS = model.benchmarks;
