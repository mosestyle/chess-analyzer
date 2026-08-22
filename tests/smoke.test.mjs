import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('package declares Stockfish 18 and V0.2.0', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.dependencies.stockfish, '18.0.8');
  assert.equal(pkg.version, '0.2.0');
});

test('desktop review has isolated engine scroll and anchored nav layout', async () => {
  const review = await text('src/pages/ReviewPage.tsx');
  const css = await text('src/styles/app.css');
  assert.match(review, /review-engine-scroll/);
  assert.match(review, /review-graph-slot/);
  assert.match(css, /grid-template-areas:[\s\S]*"nav"/);
  assert.match(css, /\.active-review \.review-engine-scroll[\s\S]*overflow-y: auto/);
  assert.match(css, /\.active-review \.review-side \.prev-next[\s\S]*grid-area: nav/);
});

test('V0.2 classification thresholds and color-aware mate logic are present', async () => {
  const classification = await text('src/analysis/classification.ts');
  assert.match(classification, /loss <= 0\.02/);
  assert.match(classification, /loss <= 0\.05/);
  assert.match(classification, /loss <= 0\.10/);
  assert.match(classification, /loss <= 0\.20/);
  assert.match(classification, /mateForColor/);
});
