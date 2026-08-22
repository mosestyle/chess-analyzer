import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('package declares Stockfish 18 and V0.2.2', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.dependencies.stockfish, '18.0.8');
  assert.equal(pkg.version, '0.2.2');
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

test('V0.2.2 keeps rating-aware expected score and thermal-friendly verification', async () => {
  const classification = await text('src/analysis/classification.ts');
  const analyzer = await text('src/analysis/analyzeGame.ts');
  const presets = await text('src/engine/presets.ts');
  assert.match(classification, /ratingScale/);
  assert.match(classification, /rating = DEFAULT_RATING/);
  assert.match(analyzer, /WhiteElo/);
  assert.match(analyzer, /BlackElo/);
  assert.match(analyzer, /nearClassificationBoundary/);
  assert.match(analyzer, /specialBestCandidate/);
  assert.match(analyzer, /slice\(0, preset\.reviewVerifyLimit\)/);
  assert.match(analyzer, /await coolDown\(preset\.reviewVerifyPauseMs\)/);
  assert.match(analyzer, /hash: 16/);
  assert.match(presets, /reviewVerifyDepth: 15/);
  assert.match(presets, /reviewVerifyLimit: 10/);
  assert.match(presets, /reviewVerifyPauseMs: 160/);
});

test('V0.2.1 calibrated accuracy model remains in V0.2.2', async () => {
  const accuracy = await text('src/analysis/accuracy.ts');
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
