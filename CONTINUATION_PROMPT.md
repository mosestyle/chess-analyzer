# Chess Analyzer — Continuation Prompt

**CURRENT VERSION: V0.3.2 — Data-Calibrated Classifier**

> IMPORTANT FOR FUTURE UPDATES: Update this file whenever the project version, architecture, calibration results, unresolved bugs, or next planned milestone changes. This file is intended to be pasted into a new ChatGPT chat so development can continue without losing context.

## Paste this into a new chat

We are continuing development of my open-source **Chess Analyzer / Game Review** project. Treat the information below as the current source of truth and continue from it rather than restarting the design.

### Product goal

Build a GitHub-hosted responsive desktop/mobile/tablet chess analyzer that feels similar in usefulness to Chess.com Game Review, while remaining an independent implementation. Main focus is the analyzer. Secondary feature is Play vs Computer with Stockfish difficulty levels 1–12.

The user wants classifications and Accuracy to become **as close to Chess.com as reasonably possible for the right reasons**, not by hard-coding individual game answers.

### Hosting / server decision

- Keep analysis **local/browser based** for now.
- Do NOT move analysis to a server unless the user revisits that decision.
- GitHub Pages deployment currently works well.

### Engine options

- Stockfish 18 Full NNUE and Stockfish 18 Lite are supported.
- Full NNUE is the preferred/default analyzer engine.
- Calibration/reference testing uses **Stockfish 18 Full NNUE + Standard**.

### Frozen Analyzer V2 engine profile

Do not casually alter the Standard measurement profile while calibrating labels:

- Stockfish 18 Full NNUE
- Standard full-game review: **48,000 nodes per position**
- MultiPV 1
- 16 MB hash
- one analysis pass per position
- small cooperative pause between positions
- **NO separate verification/re-analysis stage**

This replaced the V0.2.x heavy verification stage that caused CPU-temperature spikes. Performance/thermals improved and this measurement layer is deliberately frozen.

## What happened in V0.3.1

V0.3.1 introduced a calibration framework and gathered five real browser exports using the frozen engine profile. Those five exports have already been supplied and processed. Do **not** ask the user to re-export them unless the engine profile or feature schema changes.

V0.3.1 baseline from those exports:

- exact annotated-label agreement: **51.0%**
- summary-count MAE: **1.30 moves/category**
- Accuracy MAE: **10.29 points**

The old random parameter fitter improved the five-game training fit but worsened held-out exact labels, proving it was overfitting. It was rejected.

## V0.3.2 architecture

V0.3.2 keeps Stockfish unchanged and replaces most hand-written error-label guessing with a **two-stage supervised calibration model** generated from raw browser evidence.

Runtime flow:

1. Frozen Stockfish 18 Full NNUE Standard measurement pass.
2. Store raw per-move evidence.
3. Preserve Book / forced-move handling and a conservative Brilliant rule.
4. Very conservative Great gate because the current corpus has only one exact Great example.
5. **Stage 1:** learned error-family vs non-error-family random-forest gate.
6. **Stage 2:** learned Inaccuracy / Mistake / Miss / Blunder random-forest classifier.
7. Non-error moves are split into Best / Excellent / Good with a separately calibrated summary layer.
8. Accuracy is derived from raw move-loss evidence and passed through a regularized game-level calibration model.

The runtime model is stored in:

- `src/analysis/data-calibrated-model.json`
- `src/analysis/dataCalibratedClassifier.ts`

The older expected-points model remains in:

- `src/analysis/calibration-model.json`

Its engine profile is unchanged, but its model version is now `v2.2-data-calibrated`.

### Runtime model features

The learned classifier uses only raw evidence from the frozen Stockfish pass, including:

- win-percentage loss
- capped/log centipawn loss
- win percentage before/after
- mover rating
- engine-top flag
- legal move count
- previous move loss
- opportunity gain created by the opponent's preceding move
- mate-before / mate-after flags
- move number

It does **not** read Chess.com labels at runtime.

### Accuracy V0.3.2

Accuracy no longer relies only on the old aggregate formula. V0.3.2 first computes the unchanged raw Analyzer-V2 aggregate, then applies a regularized linear calibration using raw game features such as:

- mean/median/p75/p90 win-percentage loss
- fractions of moves losing >=5/10/20 percentage points
- rating
- game length
- Stockfish-top-move fraction

The fitted coefficients are stored inside `data-calibrated-model.json`.

## V0.3.2 measured calibration results

The new runtime benchmark script is:

`npm run calibration:supervised`

The GitHub regression gate runs:

`npm run calibration:check`

Measured on the five known calibration games after fitting on all five:

- exact annotated labels: **89.8% (88/98)**
- exact annotated error labels: **89.7% (87/97)**
- summary-count MAE: **0.76 moves/category**
- Accuracy MAE: **0.67 points**

More important generalization checks from leave-one-game-out validation during model selection:

- error-gate + error-family / non-error exact agreement: **83.3%**
- Accuracy MAE: **2.88 points**

These held-out numbers matter more than the near-perfect fit on the five training games.

### Remaining uncertainty

- **Great:** only one exact Great reference currently exists. V0.3.2 intentionally prefers false negatives over many false Great labels.
- **Brilliant:** the five-game corpus has zero exact Brilliant examples, so Brilliant remains a conservative sound-sacrifice rule rather than a learned class.
- **Best / Excellent / Good:** Chess.com PGNs do not expose exact per-move labels for these categories. They are calibrated from summary counts and therefore remain less certain than the exact NAG-labelled error categories.
- The model is optimized for Full NNUE + Standard. Quick/Lite/Deep/Maximum may drift because their raw engine evidence is not the calibration profile.

## Chess.com labelled data

Five reference PGNs are stored in:

`tests/fixtures/calibration-games.json`

Chess.com NAG annotations give exact development labels:

- `$1` = Great
- `$2` = Mistake
- `$4` = Blunder
- `$6` = Inaccuracy
- `$9` = Miss

These are **development/test ground truth only**. Runtime analysis must never consume them as answers.

Derived browser-feature fixture used by the V0.3.2 regression benchmark:

`tests/fixtures/calibration-features-v0.3.1.json`

This fixture contains raw engine evidence and development reference labels, not a runtime lookup table.

## Current five Chess.com reference summaries

Game #1 — Mosestyle vs Maria-BOT, 65 plies
- Accuracy: 77.7 / 68.8
- White: Brilliant 0, Great 0, Book 2, Best 10, Excellent 12, Good 4, Inaccuracy 4, Mistake 0, Miss 1, Blunder 0
- Black: Brilliant 0, Great 0, Book 1, Best 10, Excellent 2, Good 5, Inaccuracy 5, Mistake 9, Miss 0, Blunder 0

Game #2 — Maria-BOT vs Mosestyle, 25 plies
- Accuracy: 69.9 / 71.6
- White: Brilliant0, Great0, Book3, Best1, Excellent2, Good3, Inaccuracy3, Mistake1, Miss0, Blunder0
- Black: Brilliant0, Great0, Book3, Best5, Excellent1, Good0, Inaccuracy2, Mistake0, Miss0, Blunder1

Game #3 — Maria-BOT vs Mosestyle, 98 plies
- Accuracy: 34.7 / 40.6
- White: Brilliant0, Great1, Book3, Best9, Excellent3, Good5, Inaccuracy11, Mistake2, Miss8, Blunder6
- Black: Brilliant0, Great0, Book2, Best12, Excellent5, Good8, Inaccuracy5, Mistake4, Miss7, Blunder3

Game #4 — Maria-BOT vs Mosestyle, 76 plies
- Accuracy: 71.5 / 79.3
- White: Brilliant0, Great0, Book3, Best13, Excellent4, Good5, Inaccuracy6, Mistake5, Miss0, Blunder0
- Black: Brilliant0, Great0, Book2, Best13, Excellent9, Good11, Inaccuracy2, Mistake0, Miss1, Blunder0

Game #5 — Maria-BOT vs Mosestyle, 25 plies
- Accuracy: 57.5 / 31.8
- White: Brilliant0, Great0, Book4, Best4, Excellent0, Good0, Inaccuracy2, Mistake1, Miss1, Blunder1
- Black: Brilliant0, Great0, Book3, Best1, Excellent0, Good2, Inaccuracy1, Mistake1, Miss2, Blunder2

The exact PGNs are already in project fixtures. Do not ask the user to retype them if the project files are available.

## Chess-Review project

Reference project: `T-Julsgaard/Chess-Review`.

Use it only as architectural/secondary benchmark inspiration. Do **not** copy its GPL source or calibration file into this project. The V0.3.x implementation is independent.

## UI/features already implemented

- PGN full-game review and FEN analysis
- Full NNUE / Lite selector
- Quick / Standard / Deep / Maximum quality
- responsive desktop/mobile/tablet layout
- SVG chess pieces and smooth movement animation
- sounds/settings
- evaluation graph + toggle
- engine lines
- Show Best / Retry
- keyboard desktop navigation + mobile arrows
- settings returns to exact review state
- Analysis Complete engine/quality badge
- opening/ECO metadata
- all Game Review categories
- Critical Moments and special tags
- Play vs Computer levels 1–12, practice/hints/takeback/casual flows
- local-first PWA / GitHub Pages
- development-only calibration export via `?calibration=1`

## Immediate next step after deploying V0.3.2

1. Deploy V0.3.2 without changing the frozen engine profile.
2. Retest **Game #3 first** with Full NNUE + Standard.
3. Compare the visible summary to Chess.com's Game #3 reference, especially Miss / Blunder / Mistake / Inaccuracy and Accuracy.
4. If Game #3 looks materially closer and performance remains good, rerun Games #1–#5 once for runtime confirmation.
5. Then expand the calibration corpus with additional Chess.com-reviewed games, especially games containing Great and Brilliant moves and a wider range of ratings.
6. Do not hand-tune one game in isolation. Refit/revalidate using grouped hold-outs whenever the corpus changes.

## Continuation-file maintenance

Whenever a later version is created, update this `CONTINUATION_PROMPT.md` with:

- current version
- architecture/model changes
- latest benchmark and held-out metrics
- newly supplied calibration games
- resolved/unresolved issues
- exact next step
- changed user decisions

Do not let this file become stale.
