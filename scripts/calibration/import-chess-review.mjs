import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/calibration/import-chess-review.mjs <benchmark.json>');
  console.error('This imports third-party benchmark OUTPUT only. It does not copy or execute Chess-Review source code.');
  process.exit(2);
}
const raw = JSON.parse(await readFile(input, 'utf8'));
const normalized = {
  schemaVersion: 1,
  source: 'T-Julsgaard/Chess-Review benchmark output',
  importedAt: new Date().toISOString(),
  notes: 'Secondary benchmark only; Chess.com labelled PGNs remain the primary reference.',
  games: Array.isArray(raw) ? raw : (raw.games || []),
};
const outDir = path.join(process.cwd(), 'calibration-data/chess-review');
await mkdir(outDir, { recursive: true });
const target = path.join(outDir, `benchmark-${Date.now()}.json`);
await writeFile(target, JSON.stringify(normalized, null, 2) + '\n');
console.log(`Imported secondary benchmark to ${target}`);
