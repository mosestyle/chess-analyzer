import { copyFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules', 'stockfish', 'bin');
const target = path.join(root, 'public', 'stockfish');

const files = [
  'stockfish-18-single.js',
  'stockfish-18-single.wasm',
  'stockfish-18-lite-single.js',
  'stockfish-18-lite-single.wasm',
];

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

await mkdir(target, { recursive: true });

for (const file of files) {
  const from = path.join(source, file);
  const to = path.join(target, file);
  if (!(await exists(from))) {
    throw new Error(`Missing ${from}. Run npm install again and make sure stockfish@18.0.8 installed correctly.`);
  }
  await copyFile(from, to);
  console.log(`Prepared ${file}`);
}

console.log('Stockfish 18 Full NNUE + Lite single-threaded browser engines are ready.');
