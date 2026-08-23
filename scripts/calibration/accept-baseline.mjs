import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildFixtureIndex, evaluateModel, loadFeatureExports, loadJson } from './lib.mjs';

const root = process.cwd();
const features = await loadFeatureExports(path.join(root, 'calibration-data/features'));
if (!features.length) { console.error('No feature exports found.'); process.exit(2); }
const fixtures = await loadJson(path.join(root, 'tests/fixtures/calibration-games.json'));
const model = await loadJson(path.join(root, 'src/analysis/calibration-model.json'));
const metrics = evaluateModel(model, features, buildFixtureIndex(fixtures));
const baseline = {
  acceptedAt: new Date().toISOString(),
  modelVersion: model.modelVersion,
  exactLabelAccuracy: metrics.exactLabelAccuracy,
  accuracyMae: metrics.accuracyMae,
  summaryCountMae: metrics.summaryCountMae,
};
const target = path.join(root, 'calibration-data/accepted-metrics.json');
await writeFile(target, JSON.stringify(baseline, null, 2) + '\n');
console.log(`Accepted baseline written to ${target}`);
