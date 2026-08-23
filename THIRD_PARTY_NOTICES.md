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

## Cburnett chess pieces

The default chess piece artwork in `public/pieces/cburnett/` is the Cburnett
Staunton-style set by Colin M. L. Burnett. The project uses this open-source
piece set rather than copying Chess.com artwork. Keep the applicable upstream
attribution/license information when redistributing the piece files.


## Chess-Review methodology reference

V0.3/V0.3.1/V0.3.2 were designed after reviewing the public T-Julsgaard/Chess-Review project as an architectural benchmark for local calibration (stable engine settings, single-PV classification, calibration/regression workflow). Chess-Review is GPL-3.0 licensed. No Chess-Review source code, calibration JSON, images, sounds, or other assets are copied or bundled in this project. The calibration tooling can import separately produced benchmark output as secondary comparison data; this does not copy or execute the Chess-Review implementation.

Upstream reference: https://github.com/T-Julsgaard/Chess-Review
