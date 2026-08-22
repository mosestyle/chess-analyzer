# Chess Analyzer V1

**Current patch:** 0.1.1

A responsive, local-first chess analyzer built around Stockfish 18. The analyzer is the primary product; Play vs Computer is a secondary mode that feeds games back into Game Review.

## Included in this V1

### Analyzer
- Paste/upload PGN
- Paste FEN
- Stockfish 18 **Full NNUE** (default) or **Lite**
- Quick / Standard / Deep / Maximum analysis presets
- Evaluation bar and top engine lines
- Game Review with: Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss, Blunder
- Critical-moment and other special tags
- White/Black accuracy
- Evaluation graph
- Show Best
- Retry the position
- Deterministic move explanations

### Play vs Computer
- Levels **1–12**
- White / Black / Random
- Full NNUE / Lite
- Fast local Stockfish replies
- Practice Mode with live feedback
- Casual Mode with hints/takebacks
- Resign / rematch
- **Analyze This Game** after playing

### UI / platform
- Responsive desktop, tablet and mobile layouts
- Smooth board move animation
- Open-source Cburnett Staunton SVG chess pieces
- Synthesized move/capture/check/castle/promotion/game-end sounds
- Sounds/animations can be turned off
- Light/dark/system theme
- Board themes
- Installable PWA shell
- No account/backend required for core V1

## Important implementation choice

The repository does **not** commit the very large Stockfish WASM binaries. GitHub normally rejects source files above 100 MB. Instead, `stockfish@18.0.8` is installed from npm and `scripts/prepare-stockfish.mjs` copies the two required browser engines into `public/stockfish/` during development/build.

V1 uses the **single-threaded Full NNUE and Lite builds**. This makes the site work on GitHub Pages without requiring COOP/COEP response headers. The engine model is still Full NNUE when Full is selected.

## Run locally

Requirements: Node.js 22+ recommended.

```bash
npm install
npm run dev
```

The first `npm install` is large because Stockfish 18 Full NNUE is more than 100 MB.

Production build:

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

A ready-made workflow is included at:

`.github/workflows/deploy-pages.yml`

See [`DEPLOY_GITHUB.md`](DEPLOY_GITHUB.md) for the exact click-by-click steps.

If you are updating an existing 0.1.0 deployment, also see [`UPDATE_NOTES_0.1.1.md`](UPDATE_NOTES_0.1.1.md).

## Calibration warning

The move classifications, accuracy formula, Brilliant/Great heuristics, critical-moment logic and explanations are **our own V1 algorithms**. They are deliberately isolated in `src/analysis/` so they can be calibrated with a larger PGN/test corpus without rewriting the UI.

They are not Chess.com's proprietary Game Review implementation.

## License

Application source: MIT (see `LICENSE`).

Stockfish/Stockfish.js: GPLv3. See `THIRD_PARTY_NOTICES.md` and `LICENSES/Stockfish-GPL-3.0.txt`.
