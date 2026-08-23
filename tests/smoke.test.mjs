import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
async function text(path) { return readFile(new URL(path, root), 'utf8'); }

test('package declares Stockfish 18 and V0.3.2', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.dependencies.stockfish, '18.0.8');
  assert.equal(pkg.version, '0.3.2');
});

test('desktop review keeps engine scroll and anchored navigation', async () => {
  const review = await text('src/pages/ReviewPage.tsx');
  const css = await text('src/styles/app.css');
  assert.match(review, /review-engine-scroll/);
  assert.match(css, /grid-template-areas:[\s\S]*"nav"/);
  assert.match(css, /\.active-review \.review-side \.prev-next[\s\S]*grid-area: nav/);
});

test('Analyzer V2 uses one fixed-node pass and no verification stage', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  const presets = await text('src/engine/presets.ts');
  assert.match(analyzer, /one frozen, reproducible Stockfish measurement pass/);
  assert.match(analyzer, /nodes: preset\.reviewNodes/);
  assert.doesNotMatch(analyzer, /Verifying important position|Refining special position|reviewVerify/);
  assert.match(presets, /standard:[\s\S]*reviewNodes: 48_000/);
  assert.match(presets, /reviewMultiPV: 1/);
});

test('Stockfish wrapper supports fixed node searches', async () => {
  const engine = await text('src/engine/StockfishEngine.ts');
  assert.match(engine, /nodes\?: number/);
  assert.match(engine, /go nodes/);
});

test('Analyzer V2 separates raw evidence from displayed labels', async () => {
  const types = await text('src/types.ts');
  const analyzer = await text('src/analysis/analyzeGame.ts');
  assert.match(types, /winPctLoss\?: number/);
  assert.match(types, /cpLoss\?: number/);
  assert.match(types, /isEngineTop\?: boolean/);
  assert.match(types, /standardClassification\?:/);
  assert.match(analyzer, /applyRelationalClassifications\(reviewMoves\)/);
});

test('ordinary 2/5/10/20 bands remain as raw diagnostic evidence', async () => {
  const calibration = await text('src/analysis/calibration-model.json');
  const classification = await text('src/analysis/classification.ts');
  assert.match(calibration, /"excellent": 2/);
  assert.match(calibration, /"good": 5/);
  assert.match(calibration, /"inaccuracy": 10/);
  assert.match(calibration, /"mistake": 20/);
  assert.match(classification, /standardClassification/);
});

test('full Game Review uses the learned two-stage classifier', async () => {
  const classifier = await text('src/analysis/dataCalibratedClassifier.ts');
  const classification = await text('src/analysis/classification.ts');
  assert.match(classifier, /gateForest/);
  assert.match(classifier, /errorForest/);
  assert.match(classifier, /calibratedErrorClassification/);
  assert.match(classification, /calibratedErrorClassification\(move, previous\)/);
  assert.match(classification, /calibratedNonErrorClassification\(move\)/);
});

test('Great and Brilliant remain deliberately conservative special categories', async () => {
  const classification = await text('src/analysis/classification.ts');
  const classifier = await text('src/analysis/dataCalibratedClassifier.ts');
  assert.match(classification, /move\.classification = 'Brilliant'/);
  assert.match(classifier, /calibratedGreatCandidate/);
  assert.match(classification, /move\.classification = 'Great'/);
  assert.match(classification, /beforeMate != null && beforeMate > 0/);
});

test('Accuracy is calibrated from raw evidence and remains independent of displayed label', async () => {
  const accuracy = await text('src/analysis/accuracy.ts');
  assert.match(accuracy, /rawAggregateAccuracy/);
  assert.match(accuracy, /data-calibrated-model\.json/);
  assert.match(accuracy, /meanLoss/);
  assert.match(accuracy, /p90Loss/);
  assert.doesNotMatch(accuracy, /move\.classification/);
});

test('calibration fixtures contain all five Chess.com comparison games', async () => {
  const games = JSON.parse(await text('tests/fixtures/calibration-games.json'));
  assert.equal(games.length, 5);
  assert.deepEqual(games.map((g) => g.id), ['game-1', 'game-2', 'game-3', 'game-4', 'game-5']);
  assert.equal(games[0].whiteAccuracy, 77.7);
  assert.equal(games[2].whiteCounts.Blunder, 6);
  assert.equal(games[2].blackCounts.Miss, 7);
  assert.equal(games[4].blackAccuracy, 31.8);
});

test('runtime does not read Chess.com NAGs as answers', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  const classifier = await text('src/analysis/dataCalibratedClassifier.ts');
  assert.doesNotMatch(analyzer, /\$1|\$2|\$4|\$6|\$9/);
  assert.doesNotMatch(classifier, /\$1|\$2|\$4|\$6|\$9/);
});

test('analysis summary still shows engine and quality metadata', async () => {
  const review = await text('src/pages/ReviewPage.tsx');
  assert.match(review, /Stockfish 18 Full NNUE/);
  assert.match(review, /ANALYSIS_PRESETS\[review\.analysisQuality\]\.label/);
});

test('opening metadata still supports ECOUrl calibration lines', async () => {
  const openings = await text('src/chess/openings.ts');
  assert.match(openings, /openingFromHeaders/);
  assert.match(openings, /ECOUrl/);
  assert.match(openings, /Ponziani Opening: Jaenisch-Neumann Gambit/);
  assert.match(openings, /French Defense: Queen's Knight Variation/);
});

test('Play Practice Mode remains compatible with context-free classifier', async () => {
  const play = await text('src/pages/PlayPage.tsx');
  assert.match(play, /legalCount,/);
  assert.match(play, /beforeMate: before\.mate/);
  assert.match(play, /afterMate,/);
  assert.match(play, /Missed Mate/);
});
