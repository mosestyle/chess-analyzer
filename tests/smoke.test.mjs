import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('package declares Stockfish 18 and V0.2.4', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.dependencies.stockfish, '18.0.8');
  assert.equal(pkg.version, '0.2.4');
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

test('V0.2.4 Standard stays bounded and never returns to ten deep verifications', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  const presets = await text('src/engine/presets.ts');
  assert.match(analyzer, /reviewVerifyMovetimeMs/);
  assert.match(analyzer, /Refining special position/);
  assert.doesNotMatch(analyzer, /reviewVerifyDepth/);
  assert.match(presets, /reviewVerifyMovetimeMs: 120/);
  assert.match(presets, /reviewVerifyLimit: 2/);
  assert.match(presets, /reviewVerifyErrors: false/);
  assert.match(presets, /quick:[\s\S]*reviewVerifyLimit: 0/);
});

test('V0.2.4 uses published Classification V2 ordinary bands', async () => {
  const classification = await text('src/analysis/classification.ts');
  assert.match(classification, /excellent: 0\.02/);
  assert.match(classification, /good: 0\.05/);
  assert.match(classification, /inaccuracy: 0\.10/);
  assert.match(classification, /mistake: 0\.20/);
  assert.match(classification, /BASE_WIN_CURVE = 0\.00368208/);
  assert.match(classification, /winCurveForRating/);
});

test('Best is between the V0.2.2 and V0.2.3 extremes', async () => {
  const classification = await text('src/analysis/classification.ts');
  assert.match(classification, /confirmedBest/);
  assert.match(classification, /loss <= 0\.012/);
  assert.match(classification, /equivalentBest/);
  assert.match(classification, /loss <= 0\.0025/);
});

test('Great models outcome changes and only-good moves', async () => {
  const classification = await text('src/analysis/classification.ts');
  assert.match(classification, /rescuesLoss/);
  assert.match(classification, /createsWin/);
  assert.match(classification, /onlyGoodMove/);
  assert.match(classification, /winningExpectedThreshold/);
});

test('Miss requires a newly created winning opportunity and can replace a standard error', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  assert.match(analyzer, /newlyWinning/);
  assert.match(analyzer, /clearlyGiftedChance/);
  assert.match(analyzer, /failedToCashIn/);
  assert.match(analyzer, /\['Inaccuracy', 'Mistake', 'Blunder'\]\.includes\(current\.classification\)/);
  assert.match(analyzer, /previous\.classification !== 'Miss'/);
});

test('Critical Moments are ranked and capped more tightly', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  assert.match(analyzer, /function trimCriticalMoments/);
  assert.match(analyzer, /Math\.ceil\(moves\.length \/ 16\)/);
  assert.match(analyzer, /Math\.min\(8/);
});

test('calibration fixtures contain all five comparison games and Chess.com references', async () => {
  const games = JSON.parse(await text('tests/fixtures/calibration-games.json'));
  assert.equal(games.length, 5);
  assert.deepEqual(games.map((g) => g.id), ['game-1', 'game-2', 'game-3', 'game-4', 'game-5']);
  assert.equal(games[0].whiteAccuracy, 77.7);
  assert.equal(games[2].whiteCounts.Blunder, 6);
  assert.equal(games[2].blackCounts.Miss, 7);
  assert.equal(games[4].blackAccuracy, 31.8);
  assert.ok(games.every((g) => /\$[12469]/.test(g.pgn)));
});

test('runtime analyzer ignores embedded PGN NAG labels', async () => {
  const analyzer = await text('src/analysis/analyzeGame.ts');
  assert.doesNotMatch(analyzer, /\$1|\$2|\$4|\$6|\$9/);
  assert.match(analyzer, /NAG annotations in imported PGNs are intentionally ignored/);
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
