# Architecture

## Product boundaries

Analyzer is primary. Play Computer is secondary and reuses the same board, engine, settings, sounds and review pipeline.

## Main modules

- `src/engine/` — Stockfish worker lifecycle, UCI parsing and engine presets.
- `src/analysis/` — expected-score loss, classifications, accuracy, explanations and full-PGN analysis.
- `src/chess/` — notation helpers and small opening-name/book heuristics.
- `src/components/` — board, evaluation graph/bar and reusable UI.
- `src/pages/` — Home, Analyze, Review, Play, Settings and About.
- `src/play/` — 1–12 difficulty mapping.

## Engine lifecycle

Only one Stockfish engine worker is kept alive at a time. Switching Full ↔ Lite terminates the old worker before creating the new one.

## Deployment

GitHub Actions builds Vite, downloads Stockfish through npm, copies the selected Stockfish.js artifacts to `public/stockfish`, and uploads the resulting `dist/` directory to GitHub Pages.

## Future native Android

The analysis specifications are intentionally separate from the UI. A future Android Studio app can implement the same behavior with Kotlin/Compose and native Stockfish C++ via the NDK.
