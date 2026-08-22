# Analysis specification — V1

For a PGN, reconstruct every position from the starting FEN. Analyze the initial position and every position after a move once, then reuse adjacent evaluations for each move.

For a move by White:

`loss = expectedScore(before) - expectedScore(after)`

For Black, expected score is inverted. Raw centipawns are mapped through a logistic expected-score function so errors in already-won/lost positions are treated differently from errors near equality.

V1 thresholds are intentionally tunable and live in `src/analysis/classification.ts`.

Game review stores:
- FEN before/after
- played SAN/UCI
- best move
- top PVs
- evaluation before/after
- expected-score loss
- classification
- special tags
- explanation

Terminal mate/draw positions receive synthetic terminal evaluations instead of asking Stockfish to search a position with no legal move.
