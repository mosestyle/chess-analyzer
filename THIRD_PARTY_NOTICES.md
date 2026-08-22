# Third-party notices

## Stockfish / Stockfish.js

This project uses **Stockfish 18** through **Stockfish.js 18.0.8**.

- Stockfish.js repository: https://github.com/nmrugg/stockfish.js
- Stockfish upstream: https://github.com/official-stockfish/Stockfish
- Stockfish.js 18.0.8 is licensed under GPL-3.0.
- A copy of GPLv3 is included at `LICENSES/Stockfish-GPL-3.0.txt`.

The browser engine files are **not committed to this repository**. `npm install`
installs the `stockfish@18.0.8` package and `npm run prepare-engines` copies the
Full NNUE single-threaded and Lite single-threaded builds into `public/stockfish/`
for local development or deployment.

This keeps the Git repository below GitHub's normal per-file source limit while
still producing a deployable GitHub Pages artifact containing the engine files.

If you redistribute a built copy containing Stockfish/Stockfish.js, comply with
GPLv3 and make the corresponding source available. The exact engine dependency is
pinned in `package.json`.

## chess.js

This project uses chess.js for chess rules, move generation, FEN and PGN handling.
See the package's own repository/license for its applicable terms.
