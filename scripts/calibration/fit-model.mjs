import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { buildFixtureIndex, evaluateModel, fitOnIds, formatPct, loadFeatureExports, loadJson } from './lib.mjs';

const root = process.cwd();
const iterationsArg = process.argv.find((arg) => arg.startsWith('--iterations='));
const iterations = iterationsArg ? Math.max(100, Number(iterationsArg.split('=')[1]) || 1500) : 1500;
const apply = process.argv.includes('--apply');
const features = await loadFeatureExports(path.join(root, 'calibration-data/features'));
if (features.length < 3) {
  console.error(`Need at least 3 calibration feature exports; found ${features.length}.`);
  console.error('Use the website with ?calibration=1 and export the known reference games first.');
  process.exit(2);
}
const fixtures = await loadJson(path.join(root, 'tests/fixtures/calibration-games.json'));
const base = await loadJson(path.join(root, 'src/analysis/calibration-model.json'));
const index = buildFixtureIndex(fixtures);
const availableIds = fixtures
  .filter((f) => features.some((exp) => exp.fingerprint === [...index.values()].find((x) => x.id === f.id)?.fingerprint))
  .map((f) => f.id);

console.log(`Fitting ${availableIds.length} games with ${iterations} search iterations per fold...`);
const foldResults = [];
for (let i = 0; i < availableIds.length; i++) {
  const holdout = availableIds[i];
  const train = new Set(availableIds.filter((id) => id !== holdout));
  const fitted = fitOnIds(base, features, index, train, iterations, 0xC0FFEE + i * 1777);
  const validation = evaluateModel(fitted.model, features, index, new Set([holdout]));
  foldResults.push({ holdout, train: fitted.metrics, validation });
  console.log(`${holdout}: train objective ${fitted.metrics.objective.toFixed(3)} · holdout exact ${formatPct(validation.exactLabelAccuracy)} · accuracy MAE ${validation.accuracyMae.toFixed(2)}`);
}

const finalFit = fitOnIds(base, features, index, new Set(availableIds), iterations * 2, 0xBADC0DE);
const finalMetrics = evaluateModel(finalFit.model, features, index, new Set(availableIds));
const crossValidation = {
  exactLabelAccuracy: foldResults.reduce((s, r) => s + r.validation.exactLabelAccuracy, 0) / foldResults.length,
  accuracyMae: foldResults.reduce((s, r) => s + r.validation.accuracyMae, 0) / foldResults.length,
  summaryCountMae: foldResults.reduce((s, r) => s + r.validation.summaryCountMae, 0) / foldResults.length,
};

finalFit.model.modelVersion = `v2.1-fitted-${new Date().toISOString().slice(0, 10)}`;
const generatedDir = path.join(root, 'calibration-data/generated');
const reportsDir = path.join(root, 'calibration-data/reports');
await mkdir(generatedDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });
const modelOut = path.join(generatedDir, 'calibration-v2.1-fitted.json');
await writeFile(modelOut, JSON.stringify(finalFit.model, null, 2) + '\n');

let report = `# Calibration Fit Report\n\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `Games: ${availableIds.join(', ')}\n\n`;
report += `Iterations: ${iterations} per CV fold, ${iterations * 2} final\n\n`;
report += `## Cross-validation\n\n`;
report += `- Exact annotated-label match: ${formatPct(crossValidation.exactLabelAccuracy)}\n`;
report += `- Accuracy MAE: ${crossValidation.accuracyMae.toFixed(2)} points\n`;
report += `- Summary count MAE: ${crossValidation.summaryCountMae.toFixed(2)} moves/category\n\n`;
report += `## Final fit on all available games\n\n`;
report += `- Exact annotated-label match: ${formatPct(finalMetrics.exactLabelAccuracy)}\n`;
report += `- Accuracy MAE: ${finalMetrics.accuracyMae.toFixed(2)} points\n`;
report += `- Summary count MAE: ${finalMetrics.summaryCountMae.toFixed(2)} moves/category\n`;
report += `- Objective: ${finalMetrics.objective.toFixed(3)}\n\n`;
report += `## Per-category precision / recall\n\n| Category | Precision | Recall | Support |\n|---|---:|---:|---:|\n`;
for (const [label, m] of Object.entries(finalMetrics.perCategory)) report += `| ${label} | ${formatPct(m.precision)} | ${formatPct(m.recall)} | ${m.support} |\n`;
report += `\n## Hold-out folds\n\n| Holdout | Exact labels | Accuracy MAE | Count MAE |\n|---|---:|---:|---:|\n`;
for (const fold of foldResults) report += `| ${fold.holdout} | ${formatPct(fold.validation.exactLabelAccuracy)} | ${fold.validation.accuracyMae.toFixed(2)} | ${fold.validation.summaryCountMae.toFixed(2)} |\n`;
report += `\nThe generated model is NOT automatically accepted unless --apply is used. Compare hold-out metrics before applying.\n`;
const reportOut = path.join(reportsDir, 'latest-fit.md');
await writeFile(reportOut, report);

console.log(`\nGenerated model: ${modelOut}`);
console.log(`Report: ${reportOut}`);
console.log(`CV exact: ${formatPct(crossValidation.exactLabelAccuracy)} · CV Accuracy MAE: ${crossValidation.accuracyMae.toFixed(2)}`);
console.log(`Final exact: ${formatPct(finalMetrics.exactLabelAccuracy)} · final Accuracy MAE: ${finalMetrics.accuracyMae.toFixed(2)}`);
if (apply) {
  const runtimeModel = path.join(root, 'src/analysis/calibration-model.json');
  await copyFile(modelOut, runtimeModel);
  console.log(`Applied fitted model to ${runtimeModel}`);
} else {
  console.log('Not applied. Re-run with --apply only after cross-validation improves.');
}
