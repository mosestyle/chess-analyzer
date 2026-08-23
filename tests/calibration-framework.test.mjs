import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractNagReferences, pgnFingerprint } from '../scripts/calibration/lib.mjs';

const root = new URL('../', import.meta.url);
async function text(path) { return readFile(new URL(path, root), 'utf8'); }

test('package is V0.3.2 and exposes supervised calibration commands', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.version, '0.3.2');
  assert.match(pkg.scripts['calibration:supervised'], /benchmark-supervised/);
  assert.match(pkg.scripts['calibration:check'], /benchmark-supervised.*--check/);
  assert.match(pkg.scripts['calibration:fit'], /fit-model/);
});

test('frozen expected-points model and generated data model share the engine profile', async () => {
  const base = JSON.parse(await text('src/analysis/calibration-model.json'));
  const learned = JSON.parse(await text('src/analysis/data-calibrated-model.json'));
  assert.equal(base.modelVersion, 'v2.2-data-calibrated');
  assert.equal(base.engineProfile, 'sf18-full-standard-48000n-multipv1');
  assert.equal(learned.engineProfile, base.engineProfile);
  assert.equal(learned.modelVersion, 'v2.2-data-calibrated');
});

test('generated supervised model contains two forests and held-out provenance', async () => {
  const learned = JSON.parse(await text('src/analysis/data-calibrated-model.json'));
  assert.equal(learned.gateForest.trees.length, 50);
  assert.equal(learned.errorForest.trees.length, 50);
  assert.deepEqual(learned.errorForest.classes, ['Blunder', 'Inaccuracy', 'Miss', 'Mistake']);
  assert.ok(learned.benchmarks.leaveOneGameOut.errorGateAndFamilyExact >= 0.83);
  assert.ok(learned.benchmarks.leaveOneGameOut.accuracyMae < 3);
});

test('Chess.com NAG extraction yields exact Game #3 reference labels', async () => {
  const fixtures = JSON.parse(await text('tests/fixtures/calibration-games.json'));
  const game = fixtures.find((g) => g.id === 'game-3');
  const refs = extractNagReferences(game.pgn);
  const counts = refs.reduce((acc, r) => ({ ...acc, [r.label]: (acc[r.label] || 0) + 1 }), {});
  assert.equal(refs.length, 47);
  assert.deepEqual(counts, { Inaccuracy: 16, Mistake: 6, Miss: 15, Blunder: 9, Great: 1 });
  assert.equal(pgnFingerprint(game.pgn), 'fnv1a-114f4322-98');
});

test('generated calibration reference and derived raw-feature fixture contain all five games', async () => {
  const refs = JSON.parse(await text('tests/fixtures/calibration-reference.json'));
  const features = JSON.parse(await text('tests/fixtures/calibration-features-v0.3.1.json'));
  assert.equal(refs.length, 5);
  assert.equal(features.length, 5);
  assert.deepEqual(refs.map((g) => g.nagReferences.length), [19, 7, 47, 14, 11]);
  assert.deepEqual(features.map((g) => g.moves.length), [65, 25, 98, 76, 25]);
});

test('runtime analyzer never imports development NAG diagnostics', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  const classifier = await text('src/analysis/dataCalibratedClassifier.ts');
  assert.doesNotMatch(analyzer, /calibrationDiagnostics|extractChessComNagLabels|CHESSCOM_NAG_LABELS/);
  assert.doesNotMatch(classifier, /referenceNag|referenceLabel|CHESSCOM_NAG_LABELS|\$1|\$2|\$4|\$6|\$9/);
  assert.match(analyzer, /one frozen, reproducible Stockfish measurement pass/);
});

test('calibration export remains development-only behind query flag', async () => {
  const review = await text('src/pages/ReviewPage.tsx');
  const diagnostics = await text('src/analysis/calibrationDiagnostics.ts');
  assert.match(review, /calibrationMode &&/);
  assert.match(review, /Export calibration JSON/);
  assert.match(diagnostics, /get\('calibration'\) === '1'/);
  assert.match(diagnostics, /analyzerVersion: '0\.3\.2'/);
  assert.match(diagnostics, /classificationModelVersion: DATA_CALIBRATED_MODEL_VERSION/);
});

test('supervised benchmark measures runtime fit and has regression thresholds', async () => {
  const benchmark = await text('scripts/calibration/benchmark-supervised.mjs');
  assert.match(benchmark, /Annotated error exact/);
  assert.match(benchmark, /Summary count MAE/);
  assert.match(benchmark, /Accuracy MAE/);
  assert.match(benchmark, /annotatedErrorExact < 0\.88/);
  assert.match(benchmark, /summaryCountMae > 0\.85/);
});

test('legacy fitter still performs leave-one-game-out validation and is not runtime truth', async () => {
  const fit = await text('scripts/calibration/fit-model.mjs');
  assert.match(fit, /holdout/);
  assert.match(fit, /Cross-validation/);
  const runtime = await text('src/analysis/dataCalibratedClassifier.ts');
  assert.match(runtime, /data-calibrated-model\.json/);
});

test('GitHub workflow runs tests and supervised calibration regression check', async () => {
  const workflow = await text('.github/workflows/deploy-pages.yml');
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run calibration:check/);
});

test('continuation prompt is current and records calibration metrics', async () => {
  const continuation = await text('CONTINUATION_PROMPT.md');
  assert.match(continuation, /CURRENT VERSION: V0\.3\.2/);
  assert.match(continuation, /83\.3%/);
  assert.match(continuation, /2\.88 points/);
  assert.match(continuation, /Update this file whenever/);
  assert.match(continuation, /48,000 nodes per position/);
});
