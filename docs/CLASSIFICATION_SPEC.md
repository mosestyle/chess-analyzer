# Classification specification — V0.2

Main labels:

- Brilliant
- Great
- Best
- Excellent
- Good
- Book
- Inaccuracy
- Mistake
- Miss
- Blunder

Special tags are separate and may coexist with a main label:

- Critical Moment
- Only Move
- Forced Move
- Missed Win
- Missed Mate
- Missed Tactic
- Winning Sacrifice
- Hanging Piece
- Major Turning Point

## Expected-score loss bands

For a legal non-best, non-book move:

- Excellent: loss <= 0.02
- Good: loss <= 0.05
- Inaccuracy: loss <= 0.10
- Mistake: loss <= 0.20
- Blunder: loss > 0.20

The expected-score function is our own smooth mapping from Stockfish's white-perspective centipawn evaluation. This keeps the same centipawn loss from being treated identically in equal, winning and completely lost positions.

## Best / Great / Brilliant

A move that exactly matches Stockfish's top UCI move is normally Best.

Great requires:
- the played move is Stockfish's top move
- more than one legal move exists
- a meaningful expected-score gap (>= 0.12) to the second engine line

Brilliant is deliberately rare and requires:
- the played move is Stockfish's top move
- an apparent meaningful material risk/sacrifice
- a meaningful gap to the second line
- essentially no expected-score loss
- the move preserves at least a viable result

Forced moves are not promoted to Great solely because no legal alternative exists.

## Miss

Miss is applied as a second-pass contextual label. V0.2 checks that the opponent's previous move created a meaningful expected-score opportunity and that the current player then gave a substantial amount of it back.

## Special tags

Critical Moment triggers for a large expected-score swing, meaningful result-boundary crossing, or a large best-vs-second-line gap.

Missed Mate is color-aware: Stockfish mate scores are normalized to White in the engine layer, then converted to the mover's perspective before tagging.

This specification is a tunable local heuristic and does not claim to reproduce another site's private classification rules.
