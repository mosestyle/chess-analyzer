# V0.3.2 Calibration Results

The V0.3.2 runtime classifier was trained from the five V0.3.1 browser exports collected with the frozen `sf18-full-standard-48000n-multipv1` profile.

## Baseline before supervised model

V0.3.1:

- exact annotated labels: 51.0%
- summary-count MAE: 1.30 moves/category
- Accuracy MAE: 10.29 points

## V0.3.2 fit on all five calibration games

`npm run calibration:supervised` currently reports:

- annotated exact: **89.8% (88/98)**
- annotated error exact: **89.7% (87/97)**
- summary-count MAE: **0.76 moves/category**
- Accuracy MAE: **0.67 points**

Calibrated Accuracy values on the training corpus:

- Game 1: 77.1 / 68.6 vs Chess.com 77.7 / 68.8
- Game 2: 68.8 / 70.6 vs 69.9 / 71.6
- Game 3: 34.4 / 41.0 vs 34.7 / 40.6
- Game 4: 72.8 / 79.2 vs 71.5 / 79.3
- Game 5: 58.0 / 33.0 vs 57.5 / 31.8

## Grouped hold-out validation used during model selection

- error-gate + error-family / non-error exact: **83.3%**
- Accuracy MAE: **2.88 points**

These held-out numbers are intentionally retained alongside the training fit so future changes are not accepted merely because they memorize the five known games.

## Important caveats

- only one exact Great reference exists;
- zero exact Brilliant references exist;
- Best / Excellent / Good have summary-level targets rather than exact NAG labels;
- calibration is tied to Full NNUE + Standard.

The next meaningful improvement is to add more independently reviewed Chess.com games, especially Great/Brilliant examples and broader rating ranges, then refit with grouped validation.
