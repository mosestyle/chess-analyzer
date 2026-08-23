# V0.2.1 Calibration Set

This file records the five comparison games used to identify systematic V0.2 issues. The project remains an independent analyzer; these values are reference targets for calibration rather than requirements to reproduce another site's private algorithms exactly.

All project-side reference runs for the calibration set use:

- Stockfish 18 Full NNUE
- Standard quality

## Game 1 — Mosestyle vs Maria-BOT

- 65 reviewed plies
- PGN ratings: 217 vs 1000
- Opening: French Defense / Queen's Knight Variation
- Reference accuracy: 77.7 / 68.8
- V0.2 Full accuracy: 92.4 / 87.5

Reference classifications (White / Black):

- Brilliant 0 / 0
- Great 0 / 0
- Book 2 / 1
- Best 10 / 10
- Excellent 12 / 2
- Good 4 / 5
- Inaccuracy 4 / 5
- Mistake 0 / 9
- Miss 1 / 0
- Blunder 0 / 0

## Game 2 — Maria-BOT vs Mosestyle

- 25 reviewed plies
- PGN ratings: 1000 vs 217
- Opening: Ponziani Opening: Jaenisch-Neumann Gambit
- Reference accuracy: 69.9 / 71.6
- V0.2 Full accuracy: 84.2 / 83.0

Reference classifications (White / Black):

- Brilliant 0 / 0
- Great 0 / 0
- Book 3 / 3
- Best 1 / 5
- Excellent 2 / 1
- Good 3 / 0
- Inaccuracy 3 / 2
- Mistake 1 / 0
- Miss 0 / 0
- Blunder 0 / 1

## Game 3 — Maria-BOT vs Mosestyle

- 98 reviewed plies
- PGN ratings: 1000 vs 217
- Opening: King's Gambit
- Reference accuracy: 34.7 / 40.6
- V0.2 Full accuracy: 67.3 / 68.0

Reference classifications (White / Black):

- Brilliant 0 / 0
- Great 1 / 0
- Book 3 / 2
- Best 9 / 12
- Excellent 3 / 5
- Good 5 / 8
- Inaccuracy 11 / 5
- Mistake 2 / 4
- Miss 8 / 7
- Blunder 6 / 3

## Game 4 — Maria-BOT vs Mosestyle

- 76 reviewed plies
- PGN ratings: 1000 vs 217
- Opening: Ruy Lopez
- Reference accuracy: 71.5 / 79.3
- V0.2 Full accuracy: 89.9 / 94.9

Reference classifications (White / Black):

- Brilliant 0 / 0
- Great 0 / 0
- Book 3 / 2
- Best 13 / 13
- Excellent 4 / 9
- Good 5 / 11
- Inaccuracy 6 / 2
- Mistake 5 / 0
- Miss 0 / 1
- Blunder 0 / 0

## Game 5 — Maria-BOT vs Mosestyle

- 25 reviewed plies
- PGN ratings: 1000 vs 100
- Opening: Italian Game
- Reference accuracy: 57.5 / 31.8
- V0.2 Full accuracy: 75.1 / 64.7

Reference classifications (White / Black):

- Brilliant 0 / 0
- Great 0 / 0
- Book 4 / 3
- Best 4 / 1
- Excellent 0 / 0
- Good 0 / 2
- Inaccuracy 2 / 1
- Mistake 1 / 1
- Miss 1 / 2
- Blunder 1 / 2

## Recurring V0.2 findings

The five games showed the same problems often enough to justify a model change:

- overall and phase Accuracy too high
- too many Excellent labels
- too few Best labels in several games
- occasional false Great labels
- inconsistent error severity in tactical / already-decided positions
- slightly low Miss counts in the Full-NNUE set
- incomplete Book/opening coverage
- too many Critical Moments in chaotic games

V0.2.1 addresses those patterns with rating-aware expected score, selective deeper verification, stricter special-move rules, geometric-heavy accuracy, and improved opening metadata.

## V0.2.1 follow-up — Game 5

The first V0.2.1 rerun of Game 5 produced:

- Reference accuracy: 57.5 / 31.8
- V0.2 Full accuracy: 75.1 / 64.7
- V0.2.1 Full accuracy: 53.6 / 42.7

This was a major improvement, especially for White, but V0.2.1's deeper verifier caused sustained high CPU load during the verification phase. V0.2.2 therefore keeps the calibrated scoring/classification model while making verification bounded and thermal-friendly.

## V0.2.2 full five-game follow-up

After the thermal-limited V0.2.2 reruns, the aggregate classification totals across all 289 reviewed plies were:

Reference totals:

- Great 1
- Book 26
- Best 78
- Excellent 38
- Good 43
- Inaccuracy 41
- Mistake 23
- Miss 20
- Blunder 13

V0.2.2 totals:

- Great 0
- Book 26
- Best 106
- Excellent 47
- Good 23
- Inaccuracy 34
- Mistake 8
- Miss 34
- Blunder 11

The strongest recurring signals were therefore:

- Best +28 (too permissive)
- Miss +14 (too permissive)
- Good -20
- Mistake -15
- Excellent +9
- Inaccuracy -7
- Book exactly matched in aggregate

V0.2.3 is explicitly tuned around these aggregate errors rather than one individual game. It also removes the repeated Standard `10/10` verification behavior observed in all five V0.2.2 test runs.

## V0.2.3 follow-up and V0.2.4 direction

V0.2.3 successfully removed the repeated `10/10` Standard verifier, but its stricter Best threshold plus altered ordinary bands over-corrected the distribution in the long tactical calibration game. In particular, too many former Misses were redistributed into Blunder/Mistake/Good, while Chess.com still showed a large Miss population.

V0.2.4 therefore changes strategy instead of continuing to move category thresholds:

- restore the published Classification V2 bands exactly (0.02 / 0.05 / 0.10 / 0.20)
- keep a middle-ground Best confirmation rule
- move calibration effort into the evaluation -> expected-score conversion
- center that conversion on the 0.00368208 chess win-probability sigmoid with a mild rating adjustment
- define Great through outcome changes / only-good-move logic
- define Miss through a newly-created winning opportunity rather than through the preceding label alone
- retain V0.2.3's bounded thermal-friendly Standard verifier
- never use embedded Chess.com `$NAG` annotations as runtime answers

The five reference PGNs and Chess.com summary totals are stored in `tests/fixtures/calibration-games.json` so future classifier changes have a stable regression dataset.

## V0.3 architecture reset

After V0.2.4 continued to move individual labels around between releases, V0.3 stops hand-tuning summary totals. The five comparison games are now treated as a validation corpus for Analyzer Engine V2.

The engine measurement contract is frozen first (fixed nodes, MultiPV 1, one pass). Only after that should calibration constants or relational rules be adjusted. Accuracy is based on raw win-probability loss and is independent of final category labels.

T-Julsgaard/Chess-Review is used as an architectural benchmark only; its GPL source and calibration file are not copied into this repository.

## V0.3.1 objective calibration framework

V0.3.1 stops changing runtime thresholds by hand. The engine profile from V0.3 is frozen, tunable parameters are centralized in `src/analysis/calibration-model.json`, exact Chess.com `$1/$2/$4/$6/$9` move labels are extracted for development only, and raw browser feature exports feed a deterministic fitter with leave-one-game-out cross-validation. See `CALIBRATION_FRAMEWORK.md` for the current workflow. `CONTINUATION_PROMPT.md` must be updated on future releases so the calibration state is not lost between chats.

## V0.3.2 supervised calibration result

The five V0.3.1 browser exports were used to train a two-stage random-forest classifier on raw move evidence. Grouped leave-one-game-out model selection reached 83.3% exact agreement across the learned error/non-error target family, while the regularized Accuracy model reached 2.88 points MAE on held-out games. The final model fitted on all five current games reaches 89.7% exact agreement on the 97 exact error-labelled moves, 0.76 summary-count MAE, and 0.67 Accuracy MAE on the calibration corpus. These training-fit figures must never replace the held-out metrics when deciding whether a future model genuinely improves.

The generated runtime model is stored in `src/analysis/data-calibrated-model.json`. Runtime analysis never reads Chess.com NAG annotations.
