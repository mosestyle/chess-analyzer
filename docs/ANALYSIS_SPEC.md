# Analysis specification — V0.2

For a PGN, reconstruct every position from the starting FEN. Analyze the initial position and every position after a move once, then reuse adjacent evaluations for each move.

Stockfish scores are normalized to White in the engine layer.

For a move by White:

`loss = expectedScore(before) - expectedScore(after)`

For Black, expected score is inverted. Raw centipawns are mapped through a smooth expected-score function so errors near equality matter more than equivalent centipawn changes in already-decided positions.

## Two-pass review

### Pass 1
Analyze every position with MultiPV 1. This produces the principal evaluation/best move quickly.

### Pass 2
Request additional principal variations only for positions where alternatives improve the review:

- best-move candidates
- mate candidates
- major errors losing >= 0.10 expected score

This keeps full-game analysis considerably faster than running MultiPV 2–3 on every ply.

## Stored review information

Each review move stores:

- FEN before/after
- played SAN/UCI
- best move
- top PVs for the pre-move position
- evaluation before/after
- expected-score loss
- classification
- special tags
- deterministic explanation

The explanation layer can also inspect the opponent's principal line after the played move to describe an immediate capture/mating punishment when available.

Terminal mate/draw positions receive synthetic terminal evaluations instead of asking Stockfish to search a position with no legal move.
