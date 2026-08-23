import path from 'node:path';
import { buildFixtureIndex, evaluateModel, formatPct, loadFeatureExports, loadJson } from './lib.mjs';

const root = process.cwd();
const featuresDir = path.join(root, 'calibration-data/features');
const modelFile = process.argv.includes('--model') ? process.argv[process.argv.indexOf('--model') + 1] : path.join(root, 'src/analysis/calibration-model.json');
const fixtures = await loadJson(path.join(root, 'tests/fixtures/calibration-games.json'));
const model = await loadJson(modelFile);
const exports = await loadFeatureExports(featuresDir);
if (!exports.length) {
  console.log('No calibration feature exports found.');
  console.log('Analyze a reference PGN with ?calibration=1, click Export calibration JSON, and copy the file into calibration-data/features/.');
  process.exit(0);
}
const index = buildFixtureIndex(fixtures);
const metrics = evaluateModel(model, exports, index);
console.log(`Model: ${model.modelVersion || modelFile}`);
console.log(`Matched games: ${metrics.games}`);
console.log(`Exact annotated-label match: ${formatPct(metrics.exactLabelAccuracy)}`);
console.log(`Annotated-label penalty: ${metrics.meanLabelPenalty.toFixed(3)}`);
console.log(`Summary count MAE: ${metrics.summaryCountMae.toFixed(2)} moves/category`);
console.log(`Accuracy MAE: ${metrics.accuracyMae.toFixed(2)} points`);
for (const [label, m] of Object.entries(metrics.perCategory)) {
  console.log(`${label.padEnd(10)} precision ${formatPct(m.precision)} · recall ${formatPct(m.recall)} · support ${m.support}`);
}
console.log('\nPer-game accuracy:');
for (const game of metrics.gameResults) {
  console.log(`${game.id}: White ${game.whiteAccuracy} vs ${game.targetWhiteAccuracy}; Black ${game.blackAccuracy} vs ${game.targetBlackAccuracy}`);
}
