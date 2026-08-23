import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const NAG_LABELS = { 1: 'Great', 2: 'Mistake', 4: 'Blunder', 6: 'Inaccuracy', 9: 'Miss' };
export const ALL_LABELS = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Mistake', 'Miss', 'Blunder'];
const ERROR_ORDER = ['Excellent', 'Good', 'Inaccuracy', 'Mistake', 'Blunder'];

export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

function stripHeaders(pgn) {
  return pgn.split(/\r?\n/).filter((line) => !line.trim().startsWith('[')).join(' ');
}

function stripNestedVariations(text) {
  let out = '';
  let depth = 0;
  for (const char of text) {
    if (char === '(') { depth += 1; continue; }
    if (char === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) out += char;
  }
  return out;
}

function tokensForPgn(pgn) {
  let text = stripHeaders(pgn).replace(/\{[^}]*\}/g, ' ').replace(/;[^\n\r]*/g, ' ');
  text = stripNestedVariations(text);
  return text.split(/\s+/).map((t) => t.trim()).filter(Boolean);
}

export function normalizedMoveTokens(pgn) {
  const tokens = [];
  for (const raw of tokensForPgn(pgn)) {
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue;
    if (/^\$\d+$/.test(raw)) continue;
    if (/^\d+\.(\.\.)?$/.test(raw) || /^\d+\.\.\.$/.test(raw)) continue;
    const token = raw.replace(/^\d+\.(?:\.\.)?/, '');
    if (!token || /^[!?]+$/.test(token)) continue;
    tokens.push(token.replace(/\$\d+$/, ''));
  }
  return tokens;
}

export function pgnFingerprint(pgn) {
  const tokens = normalizedMoveTokens(pgn);
  const text = tokens.join(' ');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, '0')}-${tokens.length}`;
}

export function extractNagReferences(pgn) {
  const refs = [];
  let ply = 0;
  let lastSan = '';
  for (const raw of tokensForPgn(pgn)) {
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue;
    if (/^\d+\.(\.\.)?$/.test(raw) || /^\d+\.\.\.$/.test(raw)) continue;
    const standalone = raw.match(/^\$(\d+)$/);
    if (standalone) {
      const nag = Number(standalone[1]);
      if (NAG_LABELS[nag] && ply) refs.push({ ply, san: lastSan, nag, label: NAG_LABELS[nag] });
      continue;
    }
    if (/^[!?]+$/.test(raw)) continue;
    const token = raw.replace(/^\d+\.(?:\.\.)?/, '');
    if (!token) continue;
    const attached = token.match(/\$(\d+)$/);
    lastSan = token.replace(/\$\d+$/, '');
    ply += 1;
    if (attached) {
      const nag = Number(attached[1]);
      if (NAG_LABELS[nag]) refs.push({ ply, san: lastSan, nag, label: NAG_LABELS[nag] });
    }
  }
  return refs;
}

export async function loadJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

export async function loadFeatureExports(dir) {
  let names = [];
  try { names = await readdir(dir); } catch { return []; }
  const exports = [];
  for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
    const file = path.join(dir, name);
    const value = await loadJson(file);
    value.__file = file;
    exports.push(value);
  }
  return exports;
}

export function buildFixtureIndex(fixtures) {
  const byFingerprint = new Map();
  for (const fixture of fixtures) {
    const fingerprint = pgnFingerprint(fixture.pgn);
    byFingerprint.set(fingerprint, { ...fixture, fingerprint, nagReferences: extractNagReferences(fixture.pgn) });
  }
  return byFingerprint;
}

function moverCp(cp, color) { return color === 'w' ? cp : -cp; }
function mateForMover(mate, color) { if (mate == null) return null; return color === 'w' ? mate : -mate; }

export function winKForRating(model, rating = 1200) {
  const r = clamp(Number.isFinite(rating) ? rating : 1200, 100, 3000);
  const p = model.expectedPoints;
  const factor = clamp(p.ratingIntercept + r / p.ratingDivisor, p.ratingFactorMin, p.ratingFactorMax);
  return p.baseWinK * factor;
}

export function moverWinPercent(model, cp, color, rating = 1200) {
  const bounded = clamp(cp, -10_000, 10_000);
  const white = 100 / (1 + Math.exp(-winKForRating(model, rating) * bounded));
  return color === 'w' ? white : 100 - white;
}

export function winPercentDrop(model, beforeCp, afterCp, color, rating = 1200) {
  return Math.max(0, moverWinPercent(model, beforeCp, color, rating) - moverWinPercent(model, afterCp, color, rating));
}

function standardClassification(model, drop) {
  const b = model.bands;
  if (drop < b.excellent) return 'Excellent';
  if (drop < b.good) return 'Good';
  if (drop < b.inaccuracy) return 'Inaccuracy';
  if (drop < b.mistake) return 'Mistake';
  return 'Blunder';
}

function crossesClearAdvantage(model, move) {
  const before = moverCp(move.evalBefore, move.color);
  const after = moverCp(move.evalAfter, move.color);
  const ca = model.relational.clearAdvantageCp;
  return (before >= ca && after < ca) || (before >= -ca && after < -ca);
}

function previousMistakeSignal(model, move) {
  if (!move) return false;
  if (move.standardLabel === 'Blunder' || move.standardLabel === 'Mistake') return true;
  return move.standardLabel === 'Inaccuracy'
    && move.cpLoss >= model.relational.mistakeMinCpLoss
    && crossesClearAdvantage(model, move);
}

function opportunityGain(model, previous, current) {
  const rating = current.rating ?? 1200;
  const beforeOpp = moverWinPercent(model, previous.evalBefore, current.color, rating);
  const afterOpp = moverWinPercent(model, current.evalBefore, current.color, rating);
  return Math.max(0, afterOpp - beforeOpp);
}

export function classifyGame(model, exportedGame) {
  const moves = exportedGame.moves.map((raw) => {
    const rating = Number(raw.rating) || 1200;
    const drop = winPercentDrop(model, raw.evalBefore, raw.evalAfter, raw.color, rating);
    const cpLoss = Math.max(0, moverCp(raw.evalBefore, raw.color) - moverCp(raw.evalAfter, raw.color));
    const standardLabel = standardClassification(model, drop);
    let label;
    if (raw.isBook) label = 'Book';
    else if ((raw.legalCount ?? 2) <= 1) label = 'Best';
    else if (raw.isEngineTop) label = 'Best';
    else {
      const bm = mateForMover(raw.beforeMate, raw.color);
      const am = mateForMover(raw.afterMate, raw.color);
      if (bm != null && bm > 0 && (am == null || am <= 0)) label = 'Miss';
      else if ((bm == null || bm >= 0) && am != null && am < 0) label = moverCp(raw.evalBefore, raw.color) > -model.relational.clearAdvantageCp ? 'Mistake' : 'Blunder';
      else label = standardLabel;
    }
    return { ...raw, rating, winPctLoss: drop, cpLoss, standardLabel, label };
  });

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const previous = i > 0 ? moves[i - 1] : undefined;
    const previousPrevious = i > 1 ? moves[i - 2] : undefined;
    const r = model.relational;
    const beforeWin = moverWinPercent(model, move.evalBefore, move.color, move.rating);
    const afterWin = moverWinPercent(model, move.evalAfter, move.color, move.rating);
    const beforeMate = mateForMover(move.beforeMate, move.color);
    const afterMate = mateForMover(move.afterMate, move.color);
    if (move.label === 'Book') continue;
    if ((move.legalCount ?? 2) <= 1) { move.label = 'Best'; continue; }

    const prevMistake = previousMistakeSignal(model, previous);
    const prevPrevMistake = previousMistakeSignal(model, previousPrevious);
    const gain = previous ? opportunityGain(model, previous, move) : 0;
    const previousWasMiss = previous?.label === 'Miss';

    if (move.isEngineTop && move.isSacrifice && move.winPctLoss < r.specialMaxLoss
      && beforeWin < r.brilliantMaxWinBefore && afterWin >= r.brilliantMinWinAfter
      && (prevMistake || (!previousMistakeSignal(model, previous) && prevPrevMistake) || (afterMate != null && afterMate > 0))) {
      move.label = 'Brilliant';
      continue;
    }
    if (move.isEngineTop && !previousWasMiss && prevMistake && gain >= r.greatMinOpportunityGain
      && move.winPctLoss < r.specialMaxLoss && afterWin >= beforeWin - 1) {
      move.label = 'Great';
      continue;
    }
    if (move.isEngineTop) { move.label = 'Best'; continue; }
    if (beforeMate != null && beforeMate > 0 && (afterMate == null || afterMate <= 0)) { move.label = 'Miss'; continue; }

    const missEligible = ['Inaccuracy', 'Mistake', 'Blunder'].includes(move.standardLabel);
    if (!previousWasMiss && previous && prevMistake && gain >= r.missMinOpportunityGain && missEligible
      && move.winPctLoss >= r.missMinMoveLoss && move.cpLoss <= previous.cpLoss + r.missToleranceCp) {
      move.label = 'Miss';
      continue;
    }
    if (move.standardLabel === 'Inaccuracy' && move.cpLoss >= r.mistakeMinCpLoss && crossesClearAdvantage(model, move)) {
      move.label = 'Mistake';
      continue;
    }
    if ((beforeMate == null || beforeMate >= 0) && afterMate != null && afterMate < 0) {
      move.label = moverCp(move.evalBefore, move.color) > -r.clearAdvantageCp ? 'Mistake' : 'Blunder';
      continue;
    }
    move.label = move.standardLabel;
  }
  return moves;
}

function ratingAccuracyMultiplier(model, rating) {
  const a = model.accuracy;
  return clamp(1 + (a.ratingReference - rating) * a.ratingSlope, a.multiplierMin, a.multiplierMax);
}

function moveAccuracy(model, dropPct, rating) {
  const a = model.accuracy;
  const adjusted = Math.max(0, dropPct) * ratingAccuracyMultiplier(model, rating);
  const raw = a.curveScale * Math.exp(-a.curveDecay * adjusted) + a.curveOffset;
  return clamp(raw, a.scoreFloor, 100);
}

function harmonicMean(values) {
  const safe = values.map((v) => Math.max(1, v));
  return safe.length / safe.reduce((sum, value) => sum + 1 / value, 0);
}

function powerMean(values, p, floor) {
  if (!values.length) return 100;
  const safe = values.map((v) => Math.max(floor, v));
  const avg = safe.reduce((sum, value) => sum + Math.pow(value, p), 0) / safe.length;
  return Math.pow(avg, 1 / p);
}

function aggregateAccuracy(model, moves) {
  if (!moves.length) return 100;
  const a = model.accuracy;
  const values = moves.map((m) => moveAccuracy(model, m.winPctLoss, m.rating));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const harmonic = harmonicMean(values);
  const power = powerMean(values, a.powerP, a.powerFloor);
  const badFraction = values.filter((v) => v < a.badMoveThreshold).length / values.length;
  let score = a.meanWeight * mean + a.harmonicWeight * harmonic + a.powerWeight * power;
  score -= Math.max(0, badFraction - a.badFractionGrace) * a.badFractionPenalty;
  return Math.round(clamp(score, 0, 100) * 10) / 10;
}

function labelPenalty(reference, predicted) {
  if (reference === predicted) return 0;
  if (reference === 'Great' && predicted === 'Best') return 0.35;
  if (reference === 'Miss' && ['Inaccuracy', 'Mistake', 'Blunder'].includes(predicted)) return 0.55;
  if (predicted === 'Miss' && ['Inaccuracy', 'Mistake', 'Blunder'].includes(reference)) return 0.65;
  const ri = ERROR_ORDER.indexOf(reference);
  const pi = ERROR_ORDER.indexOf(predicted);
  if (ri >= 0 && pi >= 0) return Math.min(1.2, Math.abs(ri - pi) * 0.4);
  return 1.2;
}

function countsFor(moves, color) {
  const counts = Object.fromEntries(ALL_LABELS.map((label) => [label, 0]));
  for (const move of moves.filter((m) => m.color === color)) counts[move.label] += 1;
  return counts;
}

export function evaluateModel(model, featureExports, fixtureIndex, includeIds = null) {
  const selected = featureExports.filter((exp) => {
    const fixture = fixtureIndex.get(exp.fingerprint);
    return fixture && (!includeIds || includeIds.has(fixture.id));
  });
  let exact = 0;
  let labeled = 0;
  let penalty = 0;
  let countAbs = 0;
  let countCells = 0;
  let accuracyAbs = 0;
  let accuracyCells = 0;
  const perCategory = Object.fromEntries(Object.values(NAG_LABELS).map((label) => [label, { tp: 0, fp: 0, fn: 0 }]));
  const games = [];

  for (const exp of selected) {
    const fixture = fixtureIndex.get(exp.fingerprint);
    const predictedMoves = classifyGame(model, exp);
    const refs = new Map(fixture.nagReferences.map((r) => [r.ply, r.label]));
    for (const move of predictedMoves) {
      const reference = refs.get(move.ply);
      if (!reference) continue;
      labeled += 1;
      if (move.label === reference) exact += 1;
      penalty += labelPenalty(reference, move.label);
      for (const label of Object.keys(perCategory)) {
        if (reference === label && move.label === label) perCategory[label].tp += 1;
        else if (reference !== label && move.label === label) perCategory[label].fp += 1;
        else if (reference === label && move.label !== label) perCategory[label].fn += 1;
      }
    }

    const whiteCounts = countsFor(predictedMoves, 'w');
    const blackCounts = countsFor(predictedMoves, 'b');
    for (const label of ALL_LABELS) {
      countAbs += Math.abs(whiteCounts[label] - fixture.whiteCounts[label]); countCells += 1;
      countAbs += Math.abs(blackCounts[label] - fixture.blackCounts[label]); countCells += 1;
    }
    const whiteAccuracy = aggregateAccuracy(model, predictedMoves.filter((m) => m.color === 'w'));
    const blackAccuracy = aggregateAccuracy(model, predictedMoves.filter((m) => m.color === 'b'));
    accuracyAbs += Math.abs(whiteAccuracy - fixture.whiteAccuracy) + Math.abs(blackAccuracy - fixture.blackAccuracy);
    accuracyCells += 2;
    games.push({
      id: fixture.id,
      label: fixture.label,
      whiteAccuracy,
      blackAccuracy,
      targetWhiteAccuracy: fixture.whiteAccuracy,
      targetBlackAccuracy: fixture.blackAccuracy,
      whiteCounts,
      blackCounts,
    });
  }

  const metrics = {
    games: selected.length,
    labeledMoves: labeled,
    exactLabelAccuracy: labeled ? exact / labeled : 0,
    meanLabelPenalty: labeled ? penalty / labeled : 99,
    summaryCountMae: countCells ? countAbs / countCells : 99,
    accuracyMae: accuracyCells ? accuracyAbs / accuracyCells : 99,
    perCategory: {},
    gameResults: games,
  };
  for (const [label, m] of Object.entries(perCategory)) {
    metrics.perCategory[label] = {
      precision: m.tp + m.fp ? m.tp / (m.tp + m.fp) : 0,
      recall: m.tp + m.fn ? m.tp / (m.tp + m.fn) : 0,
      support: m.tp + m.fn,
    };
  }
  metrics.objective = metrics.meanLabelPenalty * 1.8 + metrics.summaryCountMae / 7 + metrics.accuracyMae / 9;
  return metrics;
}

function seeded(seed = 0xC0FFEE) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function mutateNumber(rng, value, min, max, relative = 0.18) {
  const span = Math.max((max - min) * 0.035, Math.abs(value) * relative);
  return clamp(value + (rng() * 2 - 1) * span, min, max);
}

function normalizeAccuracyWeights(model) {
  const a = model.accuracy;
  const sum = Math.max(0.001, a.meanWeight + a.harmonicWeight + a.powerWeight);
  a.meanWeight /= sum; a.harmonicWeight /= sum; a.powerWeight /= sum;
}

export function mutateModel(base, rng) {
  const m = deepClone(base);
  const tuners = [
    () => { m.expectedPoints.baseWinK = mutateNumber(rng, m.expectedPoints.baseWinK, 0.0014, 0.006, 0.12); },
    () => { m.expectedPoints.ratingIntercept = mutateNumber(rng, m.expectedPoints.ratingIntercept, 0.68, 1.05, 0.06); },
    () => { m.expectedPoints.ratingDivisor = Math.round(mutateNumber(rng, m.expectedPoints.ratingDivisor, 4500, 20000, 0.14)); },
    () => { m.relational.clearAdvantageCp = Math.round(mutateNumber(rng, m.relational.clearAdvantageCp, 80, 450, 0.16)); },
    () => { m.relational.mistakeMinCpLoss = Math.round(mutateNumber(rng, m.relational.mistakeMinCpLoss, 40, 300, 0.20)); },
    () => { m.relational.missToleranceCp = Math.round(mutateNumber(rng, m.relational.missToleranceCp, 0, 260, 0.30)); },
    () => { m.relational.missMinOpportunityGain = mutateNumber(rng, m.relational.missMinOpportunityGain, 1, 25, 0.28); },
    () => { m.relational.missMinMoveLoss = mutateNumber(rng, m.relational.missMinMoveLoss, 0.5, 15, 0.28); },
    () => { m.relational.greatMinOpportunityGain = mutateNumber(rng, m.relational.greatMinOpportunityGain, 3, 30, 0.20); },
    () => { m.relational.specialMaxLoss = mutateNumber(rng, m.relational.specialMaxLoss, 0.2, 5, 0.22); },
    () => { m.accuracy.ratingSlope = mutateNumber(rng, m.accuracy.ratingSlope, 0, 0.00035, 0.28); },
    () => { m.accuracy.curveDecay = mutateNumber(rng, m.accuracy.curveDecay, 0.018, 0.12, 0.18); },
    () => { m.accuracy.meanWeight = mutateNumber(rng, m.accuracy.meanWeight, 0.05, 0.75, 0.20); normalizeAccuracyWeights(m); },
    () => { m.accuracy.harmonicWeight = mutateNumber(rng, m.accuracy.harmonicWeight, 0.05, 0.75, 0.20); normalizeAccuracyWeights(m); },
    () => { m.accuracy.powerP = mutateNumber(rng, m.accuracy.powerP, -3.5, -0.45, 0.18); },
    () => { m.accuracy.badMoveThreshold = mutateNumber(rng, m.accuracy.badMoveThreshold, 25, 75, 0.12); },
    () => { m.accuracy.badFractionGrace = mutateNumber(rng, m.accuracy.badFractionGrace, 0, 0.35, 0.25); },
    () => { m.accuracy.badFractionPenalty = mutateNumber(rng, m.accuracy.badFractionPenalty, 0, 35, 0.24); },
  ];
  const changes = 1 + Math.floor(rng() * 4);
  for (let i = 0; i < changes; i++) tuners[Math.floor(rng() * tuners.length)]();
  return m;
}

export function fitOnIds(baseModel, featureExports, fixtureIndex, ids, iterations = 1500, seed = 0xC0FFEE) {
  const rng = seeded(seed);
  let best = deepClone(baseModel);
  let bestMetrics = evaluateModel(best, featureExports, fixtureIndex, ids);
  for (let i = 0; i < iterations; i++) {
    const parent = rng() < 0.82 ? best : baseModel;
    const candidate = mutateModel(parent, rng);
    const metrics = evaluateModel(candidate, featureExports, fixtureIndex, ids);
    if (metrics.objective < bestMetrics.objective) {
      best = candidate;
      bestMetrics = metrics;
    }
  }
  return { model: best, metrics: bestMetrics };
}

export function formatPct(value) { return `${(value * 100).toFixed(1)}%`; }
