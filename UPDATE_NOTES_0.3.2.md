# Chess Analyzer V0.3.2 — Data-Calibrated Classifier

V0.3.2 is the first release that applies the supervised calibration approach introduced by V0.3.1. It does **not** change the frozen Stockfish Standard measurement profile.

## What changed

- Added `src/analysis/data-calibrated-model.json`.
- Added `src/analysis/dataCalibratedClassifier.ts`.
- Added a two-stage random-forest model:
  1. error-family vs non-error-family gate;
  2. Inaccuracy / Mistake / Miss / Blunder classifier.
- The model uses raw engine evidence only; Chess.com NAG labels remain development-only references.
- Added a conservative Great gate because the current corpus contains only one exact Great example.
- Brilliant remains a conservative sound-sacrifice rule because the current corpus contains no exact Brilliant examples.
- Best / Excellent / Good are split by a separately calibrated non-error layer using summary targets.
- Added game-level regularized Accuracy calibration from raw loss statistics.
- Added `npm run calibration:supervised`.
- `npm run calibration:check` now runs the V0.3.2 supervised regression benchmark.
- Added a compact derived calibration feature fixture for deterministic regression tests.
- Updated the continuation prompt so another chat can resume from V0.3.2 accurately.

## Frozen engine profile

Unchanged:

- Stockfish 18 Full NNUE
- Standard: 48,000 nodes per position
- MultiPV 1
- 16 MB hash
- one pass
- no verification/re-analysis stage

## Calibration results

Fit on all five current reference games:

- annotated exact: 89.8% (88/98)
- annotated error exact: 89.7% (87/97)
- summary-count MAE: 0.76 moves/category
- Accuracy MAE: 0.67 points

Held-out model-selection checks:

- grouped leave-one-game-out error gate/family exact: 83.3%
- grouped leave-one-game-out Accuracy MAE: 2.88 points

The held-out figures are the important safeguard against simply memorizing the five calibration games.

## Known limitations

The corpus is still small. It has only one exact Great move and zero Brilliant moves. Best / Excellent / Good do not have exact Chess.com per-move NAG labels, so those categories are weaker-supervision targets based on summary counts.

The calibrated model is tied to Full NNUE + Standard. Other engine/quality combinations remain usable but are not yet calibrated to the same standard.

## What to test first

Deploy V0.3.2 and rerun Game #3 with **Stockfish 18 Full NNUE + Standard**. If the visible runtime result is materially closer to Chess.com and performance remains cool/fast, rerun all five games once for confirmation.
