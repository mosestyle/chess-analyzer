# V0.3.2 Data-Calibrated Classifier

V0.3.2 keeps Analyzer V2's Stockfish measurements frozen and moves error classification to a generated supervised model.

## Why

V0.2.x demonstrated that manual threshold changes could fix one game while damaging another. V0.3.1 therefore collected raw browser evidence and exact Chess.com NAG reference labels. V0.3.2 uses those data to fit a model instead of continuing threshold-by-threshold guessing.

## Two stages

### Stage 1 — error-family gate

Predicts whether a non-book move belongs to:

- error family, or
- non-error family.

### Stage 2 — error category

If Stage 1 says error, a second forest chooses:

- Inaccuracy
- Mistake
- Miss
- Blunder

Both stages consume only raw Stockfish-derived features. Runtime code never reads the Chess.com reference labels.

## Non-error categories

Book is detected separately. Forced moves stay Best. Remaining non-error moves are split among Best / Excellent / Good using a small summary-calibrated layer. Because Chess.com PGNs do not provide exact NAG labels for these categories, confidence here is lower than for the four exact error classes.

## Great and Brilliant

The current five-game corpus contains one exact Great reference and no Brilliant references. V0.3.2 therefore uses a deliberately conservative Great gate and retains a chess-sound sacrifice rule for Brilliant. These should be retrained/reworked only after more positive examples are added.

## Accuracy

V0.3.2 preserves the old raw move-accuracy calculation as a base feature, then applies a regularized game-level calibration model from raw loss distribution features. The model is independent of the displayed classification labels.

## Reproducibility

Runtime generated model:

`src/analysis/data-calibrated-model.json`

Deterministic benchmark:

`npm run calibration:supervised`

Regression gate:

`npm run calibration:check`

The generated model declares the exact frozen engine profile it expects. A profile mismatch must be treated as a calibration warning, not silently ignored.
