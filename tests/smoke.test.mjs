import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('package declares Stockfish 18 and V0.2.3', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.dependencies.stockfish, '18.0.8');
  assert.equal(pkg.version, '0.2.3');
});

test('desktop review keeps engine scroll and anchored navigation', async () => {
  const review = await text('src/pages/ReviewPage.tsx');
  const css = await text('src/styles/app.css');
  assert.match(review, /review-engine-scroll/);
  assert.match(review, /review-graph-slot/);
  assert.match(css, /grid-template-areas:[\s\S]*"nav"/);
  assert.match(css, /\.active-review \.review-engine-scroll[\s\S]*overflow-y: auto/);
  assert.match(css, /\.active-review \.review-side \.prev-next[\s\S]*grid-area: nav/);
});

test('V0.2.3 Standard uses a tiny time-bounded verifier instead of 10 deep searches', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  const presets = await text('src/engine/presets.ts');
  assert.match(analyzer, /reviewVerifyMovetimeMs/);
  assert.match(analyzer, /Checking critical position/);
  assert.match(analyzer, /preset\.reviewVerifyErrors/);
  assert.doesNotMatch(analyzer, /reviewVerifyDepth/);
  assert.match(presets, /reviewVerifyMovetimeMs: 180/);
  assert.match(presets, /reviewVerifyLimit: 2/);
  assert.match(presets, /reviewVerifyErrors: false/);
  assert.match(presets, /quick:[\s\S]*reviewVerifyLimit: 0/);
});

test('V0.2.3 classification reduces Best inflation and narrows Excellent', async () => {
  const classification = await text('src/analysis/classification.ts');
  assert.match(classification, /confirmedBest/);
  assert.match(classification, /loss <= 0\.006/);
  assert.match(classification, /excellent: 0\.012/);
  assert.match(classification, /good: 0\.055/);
  assert.match(classification, /lines\.length >= 2/);
});

test('V0.2.3 Miss requires a previous real error and never steals Blunders', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  assert.match(analyzer, /previousWasRealError/);
  assert.match(analyzer, /opportunityGain >= 0\.085/);
  assert.match(analyzer, /\['Inaccuracy', 'Mistake'\]\.includes\(current\.classification\)/);
  assert.doesNotMatch(analyzer, /\['Inaccuracy', 'Mistake', 'Blunder'\]\.includes\(current\.classification\)/);
});

test('Critical Moments are ranked and capped by game length', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  assert.match(analyzer, /function trimCriticalMoments/);
  assert.match(analyzer, /Math\.ceil\(moves\.length \/ 12\)/);
  assert.match(analyzer, /trimCriticalMoments\(reviewMoves\)/);
});

test('rating-aware expected score and calibrated accuracy remain enabled', async () => {
  const classification = await text('src/analysis/classification.ts');
  const accuracy = await text('src/analysis/accuracy.ts');
  assert.match(classification, /ratingScale/);
  assert.match(classification, /rating = DEFAULT_RATING/);
  assert.match(accuracy, /CLASS_CAP/);
  assert.match(accuracy, /Math\.log/);
  assert.match(accuracy, /geometric \* 0\.68/);
});

test('analysis summary shows engine and quality metadata', async () => {
  const review = await text('src/pages/ReviewPage.tsx');
  assert.match(review, /Stockfish 18 Full NNUE/);
  assert.match(review, /ANALYSIS_PRESETS\[review\.analysisQuality\]\.label/);
});

test('opening metadata supports ECOUrl and calibration lines', async () => {
  const openings = await text('src/chess/openings.ts');
  assert.match(openings, /openingFromHeaders/);
  assert.match(openings, /ECOUrl/);
  assert.match(openings, /Ponziani Opening: Jaenisch-Neumann Gambit/);
  assert.match(openings, /French Defense: Queen's Knight Variation/);
});

test('Play Practice Mode remains compatible with classifier/explanation contract', async () => {
  const play = await text('src/pages/PlayPage.tsx');
  assert.match(play, /legalCount,/);
  assert.match(play, /beforeCp: before\.scoreCp/);
  assert.match(play, /afterCp: after\.scoreCp/);
  assert.match(play, /fenAfter: afterFen/);
  assert.match(play, /replyLine: afterLines\[0\]\?\.pv \|\| \[\]/);
});
