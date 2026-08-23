# Chess Analyzer V0.2.4

**Current release:** 0.2.4

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

If you are updating an existing deployment, see [`UPDATE_NOTES_0.2.4.md`](UPDATE_NOTES_0.2.4.md).

## Calibration warning

The move classifications, accuracy formula, Brilliant/Great heuristics, critical-moment logic and explanations are **our own V1 algorithms**. They are deliberately isolated in `src/analysis/` so they can be calibrated with a larger PGN/test corpus without rewriting the UI.

They are not Chess.com's proprietary Game Review implementation.

## License

Application source: MIT (see `LICENSE`).

Stockfish/Stockfish.js: GPLv3. See `THIRD_PARTY_NOTICES.md` and `LICENSES/Stockfish-GPL-3.0.txt`.


## 0.2.4 Chess.com-style calibration

Version 0.2.4 keeps the fast/cool Standard pipeline from 0.2.3, restores Chess.com's published Classification V2 expected-points bands, replaces the earlier expected-score curve with a Lichess-logistic-centered rating-aware approximation, rebalances Best/Excellent/Good, rewrites Great around outcome-changing moves, and redesigns Miss around a newly-created winning opportunity. Standard still performs at most two tiny special-position refinements (about 120 ms each) and never returns to the old 10-position deep verification stage. See `UPDATE_NOTES_0.2.4.md`.

## 0.2.3 calibration + cool Standard

Version 0.2.3 uses the completed five-game Full NNUE/Standard calibration set. It reduces Best inflation, makes Miss substantially stricter, restores more Good/Mistake labels, caps/ranks Critical Moments, and redesigns Standard verification so it no longer performs ten extra depth-15 searches on nearly every game. Standard now allows at most two short ~180 ms special-position checks. Full NNUE remains the default engine. See `UPDATE_NOTES_0.2.3.md`.

## 0.2.1 calibrated analyzer

Version 0.2.1 is the first data-driven calibration pass based on five Full-NNUE/Standard comparison games. It adds rating-aware expected score, selective deeper verification, stricter Great/Brilliant rules, a stronger accuracy model, improved Miss handling, richer ECO/opening metadata, and an engine/quality badge on Analysis Complete. See `UPDATE_NOTES_0.2.1.md` and `docs/CALIBRATION.md`.
