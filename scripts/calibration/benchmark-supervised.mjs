import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const model = JSON.parse(await readFile(path.join(root, 'src/analysis/data-calibrated-model.json'), 'utf8'));
const baseModel = JSON.parse(await readFile(path.join(root, 'src/analysis/calibration-model.json'), 'utf8'));
const games = JSON.parse(await readFile(path.join(root, 'tests/fixtures/calibration-features-v0.3.1.json'), 'utf8'));

const ALL_LABELS = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Mistake', 'Miss', 'Blunder'];
const ERROR_LABELS = new Set(['Inaccuracy', 'Mistake', 'Miss', 'Blunder']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function winKForRating(rating = 1200) {
  const p = baseModel.expectedPoints;
  const r = clamp(Number.isFinite(rating) ? rating : 1200, 100, 3000);
  const factor = clamp(p.ratingIntercept + r / p.ratingDivisor, p.ratingFactorMin, p.ratingFactorMax);
  return p.baseWinK * factor;
}
function moverWinPercent(cp, color, rating = 1200) {
  const white = 100 / (1 + Math.exp(-winKForRating(rating) * clamp(cp, -10000, 10000)));
  return color === 'w' ? white : 100 - white;
}
function mateForMover(mate, color) {
  if (mate == null) return null;
  return color === 'w' ? mate : -mate;
}
function featureContext(move, previous) {
  const rating = move.rating ?? 1200;
  const winLoss = Math.max(0, move.winPctLoss ?? 0);
  const cpLoss = Math.max(0, move.cpLoss ?? 0);
  const previousWinLoss = Math.max(0, previous?.winPctLoss ?? 0);
  const previousCpLoss = Math.max(0, previous?.cpLoss ?? 0);
  const beforeWin = move.winPctBefore ?? moverWinPercent(move.evalBefore, move.color, rating);
  const afterWin = move.winPctAfter ?? moverWinPercent(move.evalAfter, move.color, rating);
  const beforePrevious = previous ? moverWinPercent(previous.evalBefore, move.color, rating) : beforeWin;
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
function leaf(tree, vector) {
  let i = 0;
  for (;;) {
    const n = tree[i];
    if (n.p) return n.p;
    i = vector[n.f] <= n.t ? n.l : n.r;
  }
}
function forestProbabilities(forest, vector) {
  const totals = new Array(forest.classes.length).fill(0);
  for (const tree of forest.trees) {
    const p = leaf(tree, vector);
    for (let i = 0; i < totals.length; i++) totals[i] += p[i] ?? 0;
  }
  return totals.map((x) => x / forest.trees.length);
}
function forestLabel(forest, vector) {
  const p = forestProbabilities(forest, vector);
  let best = 0;
  for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
  return { label: forest.classes[best], p };
}
function vector(names, values) { return names.map((name) => values[name] ?? 0); }
function greatCandidate(move, previous) {
  const g = model.special.great;
  const ctx = featureContext(move, previous);
  const beforeWin = move.winPctBefore ?? moverWinPercent(move.evalBefore, move.color, move.rating ?? 1200);
  const afterMate = mateForMover(move.afterMate, move.color);
  const loss = Math.max(0, move.winPctLoss ?? 0);
  return g.enabled
    && (!g.requireEngineTop || move.isEngineTop)
    && afterMate == null
    && ctx.opportunityGain >= g.opportunityGainMin && ctx.opportunityGain <= g.opportunityGainMax
    && beforeWin >= g.beforeWinMin && beforeWin <= g.beforeWinMax
    && loss < g.maxLoss
    && (!g.requireNoSacrifice || !move.isSacrifice);
}
function classify(move, previous) {
  if (move.isBook) return 'Book';
  if ((move.legalCount ?? 2) <= 1) return 'Best';
  if (greatCandidate(move, previous)) return 'Great';
  const beforeMate = mateForMover(move.beforeMate, move.color);
  const afterMate = mateForMover(move.afterMate, move.color);
  if (beforeMate != null && beforeMate > 0 && (afterMate == null || afterMate <= 0)) return 'Miss';

  const ctx = featureContext(move, previous);
  const gate = forestLabel(model.gateForest, vector(model.features.gate, ctx.values));
  const errorIndex = model.gateForest.classes.indexOf('1');
  if (errorIndex >= 0 && gate.p[errorIndex] > 0.5) {
    return forestLabel(model.errorForest, vector(model.features.errorClass, ctx.values)).label;
  }
  const loss = Math.max(0, move.winPctLoss ?? 0);
  if ((move.isEngineTop && loss <= model.nonError.bestTopMaxLoss) || loss <= model.nonError.bestEquivalentMaxLoss) return 'Best';
  if (loss < model.nonError.excellentMaxLoss) return 'Excellent';
  return 'Good';
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index), hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  const f = index - lo;
  return sorted[lo] * (1 - f) + sorted[hi] * f;
}
function ratingAccuracyMultiplier(rating) {
  const a = baseModel.accuracy;
  return clamp(1 + (a.ratingReference - rating) * a.ratingSlope, a.multiplierMin, a.multiplierMax);
}
function moveAccuracy(loss, rating) {
  const a = baseModel.accuracy;
  const adjusted = Math.max(0, loss) * ratingAccuracyMultiplier(rating);
  return clamp(a.curveScale * Math.exp(-a.curveDecay * adjusted) + a.curveOffset, a.scoreFloor, 100);
}
function harmonic(values) {
  const safe = values.map((v) => Math.max(1, v));
  return safe.length / safe.reduce((s, v) => s + 1 / v, 0);
}
function powerMean(values, p, floor) {
  const safe = values.map((v) => Math.max(floor, v));
  return Math.pow(safe.reduce((s, v) => s + Math.pow(v, p), 0) / safe.length, 1 / p);
}
function rawAccuracy(moves) {
  const a = baseModel.accuracy;
  const values = moves.map((m) => moveAccuracy(m.winPctLoss ?? 0, m.rating ?? 1200));
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  let score = a.meanWeight * mean + a.harmonicWeight * harmonic(values) + a.powerWeight * powerMean(values, a.powerP, a.powerFloor);
  const bad = values.filter((v) => v < a.badMoveThreshold).length / values.length;
  score -= Math.max(0, bad - a.badFractionGrace) * a.badFractionPenalty;
  return clamp(score, 0, 100);
}
function calibratedAccuracy(moves) {
  const losses = moves.map((m) => Math.max(0, m.winPctLoss ?? 0));
  const features = {
    current: rawAccuracy(moves),
    meanLoss: losses.reduce((s, v) => s + v, 0) / losses.length,
    medianLoss: percentile(losses, .5), p75Loss: percentile(losses, .75), p90Loss: percentile(losses, .9),
    frac5: losses.filter((v) => v >= 5).length / losses.length,
    frac10: losses.filter((v) => v >= 10).length / losses.length,
    frac20: losses.filter((v) => v >= 20).length / losses.length,
    rating: moves[0]?.rating ?? 1200,
    n: moves.length,
    topFrac: moves.filter((m) => m.isEngineTop).length / moves.length,
  };
  const a = model.accuracy;
  let score = a.intercept;
  for (let i = 0; i < a.features.length; i++) score += ((features[a.features[i]] - a.mean[i]) / (a.scale[i] || 1)) * a.coef[i];
  return clamp(score, a.clampMin, a.clampMax);
}

let annotated = 0, annotatedCorrect = 0, errorAnnotated = 0, errorCorrect = 0;
let countAbs = 0, countN = 0, accuracyAbs = 0, accuracyN = 0;
const details = [];
for (const game of games) {
  const predicted = game.moves.map((move, i) => classify(move, i ? game.moves[i - 1] : undefined));
  game.moves.forEach((move, i) => {
    if (move.referenceLabel) {
      annotated += 1;
      if (predicted[i] === move.referenceLabel) annotatedCorrect += 1;
      if (ERROR_LABELS.has(move.referenceLabel)) {
        errorAnnotated += 1;
        if (predicted[i] === move.referenceLabel) errorCorrect += 1;
      }
    }
  });
  for (const [color, side] of [['w', 'white'], ['b', 'black']]) {
    const counts = Object.fromEntries(ALL_LABELS.map((label) => [label, 0]));
    game.moves.forEach((move, i) => { if (move.color === color) counts[predicted[i]] += 1; });
    const refs = game[`${side}Counts`];
    for (const label of ALL_LABELS) { countAbs += Math.abs(counts[label] - refs[label]); countN += 1; }
    const sideMoves = game.moves.filter((m) => m.color === color);
    const acc = calibratedAccuracy(sideMoves);
    const target = game[`${side}Accuracy`];
    accuracyAbs += Math.abs(acc - target); accuracyN += 1;
    details.push({ game: game.id, side, accuracy: Math.round(acc * 10) / 10, target });
  }
}
const metrics = {
  annotatedExact: annotatedCorrect / annotated,
  annotatedErrorExact: errorCorrect / errorAnnotated,
  summaryCountMae: countAbs / countN,
  accuracyMae: accuracyAbs / accuracyN,
};

console.log(`V0.3.2 supervised calibration benchmark`);
console.log(`- Annotated exact: ${(metrics.annotatedExact * 100).toFixed(1)}% (${annotatedCorrect}/${annotated})`);
console.log(`- Annotated error exact: ${(metrics.annotatedErrorExact * 100).toFixed(1)}% (${errorCorrect}/${errorAnnotated})`);
console.log(`- Summary count MAE: ${metrics.summaryCountMae.toFixed(2)} moves/category`);
console.log(`- Accuracy MAE: ${metrics.accuracyMae.toFixed(2)} points`);
for (const d of details) console.log(`  ${d.game} ${d.side}: ${d.accuracy.toFixed(1)} vs ${d.target.toFixed(1)}`);
console.log(`- Stored leave-one-game-out family/gate exact: ${(model.benchmarks.leaveOneGameOut.errorGateAndFamilyExact * 100).toFixed(1)}%`);
console.log(`- Stored leave-one-game-out Accuracy MAE: ${model.benchmarks.leaveOneGameOut.accuracyMae.toFixed(2)}`);

if (process.argv.includes('--check')) {
  const failures = [];
  if (metrics.annotatedErrorExact < 0.88) failures.push('annotated error exact fell below 88% on the calibration corpus');
  if (metrics.summaryCountMae > 0.85) failures.push('summary-count MAE exceeded 0.85');
  if (metrics.accuracyMae > 1.0) failures.push('Accuracy MAE exceeded 1.0 on the calibration corpus');
  if (model.engineProfile !== baseModel.engineProfile) failures.push('data model engine profile no longer matches frozen engine profile');
  if (failures.length) {
    console.error('Supervised calibration regression detected:');
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }
}
