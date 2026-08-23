import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildFixtureIndex, loadJson } from './lib.mjs';

const root = process.cwd();
const fixtures = await loadJson(path.join(root, 'tests/fixtures/calibration-games.json'));
const index = buildFixtureIndex(fixtures);
const out = [];
for (const fixture of fixtures) {
  const indexed = [...index.values()].find((item) => item.id === fixture.id);
  out.push({
    id: fixture.id,
    label: fixture.label,
    fingerprint: indexed.fingerprint,
    whiteAccuracy: fixture.whiteAccuracy,
    blackAccuracy: fixture.blackAccuracy,
    whiteCounts: fixture.whiteCounts,
    blackCounts: fixture.blackCounts,
    nagReferences: indexed.nagReferences,
  });
}
const target = path.join(root, 'tests/fixtures/calibration-reference.json');
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${target}`);
for (const game of out) console.log(`${game.id}: ${game.fingerprint} · ${game.nagReferences.length} exact NAG-labelled moves`);
