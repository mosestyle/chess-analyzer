# Analysis specification — V0.2.2

For a PGN, reconstruct every position from the starting FEN. Stockfish scores are normalized to White in the engine layer, while classification and expected-score loss are evaluated from the mover's perspective.

PGN metadata used by V0.2.2 includes:

- White / Black names
- WhiteElo / BlackElo when present
- ECO
- Opening / Variation when present
- ECOUrl when present

## Expected loss

For White:

`loss = expectedScore(before, White rating) - expectedScore(after, White rating)`

For Black, expected score is inverted and Black's rating is used.

The expected-score function saturates in already-decided positions, helping avoid treating every large raw centipawn swing as equally severe.

## Two-stage review

### Pass 1 — fast scan

Every position is analyzed with MultiPV 1 at the selected review depth.

Standard uses depth 12 for this pass.

### Pass 2 — thermal-friendly selective verification

V0.2.2 keeps deeper verification, but no longer deeply rechecks every routine Best move or every broad tactical heuristic.

Standard:

- verification depth 15
- maximum 10 deeper verification positions per game
- 160 ms idle gap between verification searches
- MultiPV 2 only where alternative-line information can change a boundary/special-move decision

Verification priority is highest for:

- mate transitions
- large expected-score errors
- moves close to classification boundaries
- meaningful practical/evaluation swings
- plausible Great / Brilliant / Only-Move candidates

Routine Best moves are kept from the first pass unless they have a special uniqueness/tactical signal.

This deliberately trades a small amount of second-pass depth for much lower sustained CPU use on Full NNUE while preserving the V0.2.1 rating-aware classification model.

## Quality preset verification budgets

- Quick: verify depth 11, max 4 positions, 100 ms idle gap
- Standard: verify depth 15, max 10 positions, 160 ms idle gap
- Deep: verify depth 18, max 14 positions, 90 ms idle gap
- Maximum: verify depth 21, max 20 positions, 40 ms idle gap

Deep and Maximum are intentionally more CPU intensive.

## Accuracy

Move accuracy is derived from expected-score loss and limited by the final classification. Game accuracy uses a geometric-heavy aggregation with a smaller arithmetic component.

This prevents repeated serious mistakes from being washed out by many trivial or forced moves.

The same aggregation is used for opening / middlegame / endgame accuracy.

## Opening and Book handling

Local opening-prefix recognition determines Book moves. The displayed opening name prefers PGN metadata when available and falls back to the local opening table.

## Stored review information

Each review move stores:

- FEN before/after
- SAN/UCI
- best move
- principal variations
- evaluation before/after
- expected-score loss
- classification
- special tags
- deterministic explanation

The GameReview object also stores the actual engine mode and analysis-quality preset used so the summary can display, for example:

`Stockfish 18 Full NNUE · Standard`

Terminal mate/draw positions receive synthetic terminal evaluations instead of asking Stockfish to search a position with no legal move.
