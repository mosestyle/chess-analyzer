import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractNagReferences, pgnFingerprint } from '../scripts/calibration/lib.mjs';

const root = new URL('../', import.meta.url);
async function text(path) { return readFile(new URL(path, root), 'utf8'); }

test('package is V0.3.1 and exposes calibration commands', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.version, '0.3.1');
  assert.match(pkg.scripts['calibration:fit'], /fit-model/);
  assert.match(pkg.scripts['calibration:benchmark'], /benchmark-model/);
  assert.match(pkg.scripts['calibration:check'], /check-regression/);
});

test('runtime calibration reads one shared model JSON', async () => {
  const model = JSON.parse(await text('src/analysis/calibration-model.json'));
  const calibration = await text('src/analysis/calibration.ts');
  assert.equal(model.modelVersion, 'v2.1-framework');
  assert.equal(model.engineProfile, 'sf18-full-standard-48000n-multipv1');
  assert.match(calibration, /import model from '.\/calibration-model\.json'/);
  assert.match(calibration, /EXPECTED_POINT_BANDS = model\.bands/);
  assert.match(calibration, /ACCURACY_MODEL = model\.accuracy/);
});

test('Chess.com NAG extraction yields exact Game #3 error labels', async () => {
  const fixtures = JSON.parse(await text('tests/fixtures/calibration-games.json'));
  const game = fixtures.find((g) => g.id === 'game-3');
  const refs = extractNagReferences(game.pgn);
  const counts = refs.reduce((acc, r) => ({ ...acc, [r.label]: (acc[r.label] || 0) + 1 }), {});
  assert.equal(refs.length, 47);
  assert.deepEqual(counts, { Inaccuracy: 16, Mistake: 6, Miss: 15, Blunder: 9, Great: 1 });
  assert.equal(pgnFingerprint(game.pgn), 'fnv1a-114f4322-98');
});

test('generated calibration reference contains all five fingerprints', async () => {
  const refs = JSON.parse(await text('tests/fixtures/calibration-reference.json'));
  assert.equal(refs.length, 5);
  assert.deepEqual(refs.map((g) => g.nagReferences.length), [19, 7, 47, 14, 11]);
  assert.equal(refs[2].fingerprint, 'fnv1a-114f4322-98');
});

test('runtime analyzer never imports development NAG diagnostics', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  assert.doesNotMatch(analyzer, /calibrationDiagnostics|extractChessComNagLabels|CHESSCOM_NAG_LABELS/);
  assert.match(analyzer, /one frozen, reproducible Stockfish measurement pass/);
});

test('calibration export UI is hidden behind query-mode flag', async () => {
  const review = await text('src/pages/ReviewPage.tsx');
  const diagnostics = await text('src/analysis/calibrationDiagnostics.ts');
  assert.match(review, /calibrationMode &&/);
  assert.match(review, /Export calibration JSON/);
  assert.match(diagnostics, /get\('calibration'\) === '1'/);
});

test('automatic fitter includes leave-one-game-out cross-validation', async () => {
  const fit = await text('scripts/calibration/fit-model.mjs');
  assert.match(fit, /holdout/);
  assert.match(fit, /availableIds\.filter\(\(id\) => id !== holdout\)/);
  assert.match(fit, /Cross-validation/);
  assert.match(fit, /--apply/);
});

test('benchmark measures labels, category precision/recall, counts, and Accuracy', async () => {
  const lib = await text('scripts/calibration/lib.mjs');
  assert.match(lib, /exactLabelAccuracy/);
  assert.match(lib, /summaryCountMae/);
  assert.match(lib, /accuracyMae/);
  assert.match(lib, /precision/);
  assert.match(lib, /recall/);
});

test('GitHub workflow runs tests and non-blocking calibration regression check', async () => {
  const workflow = await text('.github/workflows/deploy-pages.yml');
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run calibration:check/);
});

test('continuation prompt is current and requires future maintenance', async () => {
  const continuation = await text('CONTINUATION_PROMPT.md');
  assert.match(continuation, /CURRENT VERSION: V0\.3\.1/);
  assert.match(continuation, /Update this file whenever/);
  assert.match(continuation, /Do NOT make another manual threshold patch/);
  assert.match(continuation, /48,000 nodes per position/);
});

test('fitter executes deterministically on synthetic feature exports', async () => {
  const { buildFixtureIndex, fitOnIds } = await import('../scripts/calibration/lib.mjs');
  const fixtures = JSON.parse(await text('tests/fixtures/calibration-games.json'));
  const model = JSON.parse(await text('src/analysis/calibration-model.json'));
  const index = buildFixtureIndex(fixtures);
  const exports = fixtures.slice(0, 3).map((fixture, gameIndex) => {
    const fingerprint = [...index.values()].find((item) => item.id === fixture.id).fingerprint;
    return {
      fingerprint,
      moves: [
        { ply: 1, color: 'w', san: 'e4', uci: 'e2e4', evalBefore: 20, evalAfter: 10 - gameIndex * 5, rating: 1000, legalCount: 20, isEngineTop: true, isBook: false, isSacrifice: false, beforeMate: null, afterMate: null },
        { ply: 2, color: 'b', san: 'e5', uci: 'e7e5', evalBefore: 10, evalAfter: 80 + gameIndex * 10, rating: 217, legalCount: 20, isEngineTop: false, isBook: false, isSacrifice: false, beforeMate: null, afterMate: null },
      ],
    };
  });
  const fitted = fitOnIds(model, exports, index, new Set(['game-1', 'game-2', 'game-3']), 20, 12345);
  assert.ok(Number.isFinite(fitted.metrics.objective));
  assert.equal(fitted.model.engineProfile, model.engineProfile);
});
