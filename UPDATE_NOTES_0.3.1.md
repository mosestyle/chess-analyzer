# Chess Analyzer V0.3.1 — Calibration Framework

V0.3.1 does **not** start another round of manual label-threshold tweaking. It adds the tooling needed to make future Analyzer V2 changes measurable and repeatable.

## What changed

- The V0.3 Full NNUE + Standard engine profile remains frozen at one 48,000-node, MultiPV-1 pass per position.
- No verification stage was reintroduced.
- Tunable analyzer parameters now live in `src/analysis/calibration-model.json`.
- Runtime evaluation/Accuracy functions consume that shared model file.
- Review moves now retain the `isBook` raw feature in addition to the existing V2 evidence.
- Added development-only Chess.com NAG extraction for `$1/$2/$4/$6/$9`.
- Added a hidden calibration export button when the site is opened with `?calibration=1`.
- Added deterministic PGN fingerprints so exported evidence matches the correct fixture automatically.
- Added `npm run calibration:extract`.
- Added `npm run calibration:benchmark`.
- Added `npm run calibration:fit` with leave-one-game-out cross-validation.
- Added `npm run calibration:accept` and `npm run calibration:check` for regression protection.
- Added secondary Chess-Review benchmark-output import support without copying or running Chess-Review source code.
- Added `docs/CALIBRATION_FRAMEWORK.md`.
- Added `CONTINUATION_PROMPT.md` and made keeping it current a release requirement.

## Important safety rule

Chess.com NAGs are reference labels for development only. `analyzePgn()` does not parse them as answers. A normal imported annotated PGN is still independently analyzed by Stockfish + Analyzer V2.

## Next calibration step

Analyze the five existing fixture games on V0.3.1 with **Stockfish 18 Full NNUE + Standard** while the site URL includes `?calibration=1`. Export each calibration JSON and place the five files in `calibration-data/features/`. Then run the benchmark and fitter.

The next model update should only be accepted if cross-validation improves rather than merely making one summary look closer.
