import path from 'node:path';
import { access } from 'node:fs/promises';
import { buildFixtureIndex, evaluateModel, formatPct, loadFeatureExports, loadJson } from './lib.mjs';

const root = process.cwd();
const baselinePath = path.join(root, 'calibration-data/accepted-metrics.json');
try { await access(baselinePath); } catch {
  console.log('Calibration regression check skipped: no accepted-metrics.json yet.');
  process.exit(0);
}
const features = await loadFeatureExports(path.join(root, 'calibration-data/features'));
if (!features.length) {
  console.log('Calibration regression check skipped: no feature exports committed.');
  process.exit(0);
}
const baseline = await loadJson(baselinePath);
const fixtures = await loadJson(path.join(root, 'tests/fixtures/calibration-games.json'));
const model = await loadJson(path.join(root, 'src/analysis/calibration-model.json'));
const metrics = evaluateModel(model, features, buildFixtureIndex(fixtures));
const problems = [];
if (metrics.exactLabelAccuracy + 0.015 < baseline.exactLabelAccuracy) problems.push(`exact labels ${formatPct(metrics.exactLabelAccuracy)} < baseline ${formatPct(baseline.exactLabelAccuracy)}`);
if (metrics.accuracyMae > baseline.accuracyMae + 0.6) problems.push(`Accuracy MAE ${metrics.accuracyMae.toFixed(2)} > baseline ${baseline.accuracyMae.toFixed(2)}`);
if (metrics.summaryCountMae > baseline.summaryCountMae + 0.25) problems.push(`count MAE ${metrics.summaryCountMae.toFixed(2)} > baseline ${baseline.summaryCountMae.toFixed(2)}`);
if (problems.length) {
  console.error('Calibration regression detected:');
  problems.forEach((p) => console.error(`- ${p}`));
  process.exit(1);
}
console.log(`Calibration regression check passed: exact ${formatPct(metrics.exactLabelAccuracy)}, Accuracy MAE ${metrics.accuracyMae.toFixed(2)}, count MAE ${metrics.summaryCountMae.toFixed(2)}`);
