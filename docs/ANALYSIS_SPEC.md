# Analysis specification — V0.2.1

For a PGN, reconstruct every position from the starting FEN. Stockfish scores are normalized to White in the engine layer, while classification and expected-score loss are evaluated from the mover's perspective.

PGN metadata used by V0.2.1 includes:

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

### Pass 2 — selective deeper verification

Positions likely to change the human-facing review are re-analyzed at a deeper verification depth. Standard uses depth 17.

Verification candidates include:

- Best / Great / Brilliant candidates
- ambiguous non-best moves
- meaningful expected-score losses
- large raw evaluation swings
- mate-related positions
- tactical moved-piece-en-prise situations

When a played move needs verification, both the pre-move and post-move positions are rechecked as needed so expected loss is not calculated from mismatched search depths.

Alternative lines use MultiPV only where they add classification or explanation value.

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
