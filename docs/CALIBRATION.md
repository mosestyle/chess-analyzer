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
