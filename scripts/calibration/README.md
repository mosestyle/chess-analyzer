# Calibration scripts

These tools are development-only. Runtime analysis never consumes Chess.com NAGs as answers.

- `extract-reference.mjs`: extract exact `$1/$2/$4/$6/$9` Chess.com labels and fingerprints from the five fixtures.
- `benchmark-model.mjs`: benchmark the current model against exported raw features.
- `fit-model.mjs`: deterministic random/coordinate-style search with leave-one-game-out cross-validation.
- `check-regression.mjs`: fail when an accepted benchmark materially regresses.
- `accept-baseline.mjs`: record a benchmark as the accepted regression baseline.
- `import-chess-review.mjs`: import third-party benchmark OUTPUT only; no Chess-Review source code is copied or executed.
