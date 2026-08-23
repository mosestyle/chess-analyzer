# Classification specification — V0.2.4

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

Special tags remain separate from the main label:

- Critical Moment
- Only Move
- Forced Move
- Missed Win
- Missed Mate
- Missed Tactic
- Winning Sacrifice
- Hanging Piece
- Major Turning Point

## Rating-aware expected-score model

Stockfish centipawn evaluations are converted into mover expected score before loss is measured. V0.2.1 reads `WhiteElo` / `BlackElo` from PGN headers and adjusts the curve modestly by player rating. Missing ratings use 1200.

This is an independent local model. It is not a copy of another site's private probability curve.

## Expected-score loss bands

For a legal non-best, non-book move:

- Excellent: loss <= 0.02
- Good: loss <= 0.05
- Inaccuracy: loss <= 0.10
- Mistake: loss <= 0.20
- Blunder: loss > 0.20

Book is an opening-theory label and takes precedence when the local opening path recognizes the move.

## Best / equivalent Best

An exact Stockfish top UCI move is Best unless it satisfies stricter Great/Brilliant conditions.

Because principal variations can reorder at practical search depths, a non-top move may also be treated as Best when its expected loss and centipawn drift are numerically indistinguishable from zero. This reduces false `Excellent` labels caused only by unstable PV ordering.

## Great

Great requires:

- the played move is the actual top engine move
- more than one legal move exists
- a large expected-score gap to the second line
- the position is not already almost completely won or lost

This keeps Great focused on genuinely important unique moves rather than routine conversion moves.

## Brilliant

Brilliant is deliberately rare and requires:

- actual top engine move
- apparent meaningful material risk/sacrifice
- strong uniqueness signal versus the second line
- essentially no expected-score loss
- a position where the sacrifice preserves a viable result

## Miss

Miss is applied contextually after ordinary move classification. V0.2.1 measures how much opportunity the opponent's previous move created, then checks whether the player gave a meaningful share of that opportunity back.

Missed Mate remains a special tag and is handled separately so a forced mating opportunity is explained explicitly.

## Special tags

Critical Moment, Major Turning Point and Only Move thresholds are stricter than V0.2 to reduce tag spam in tactical games.

Mate scores are normalized to White in the engine layer and converted back to the mover's perspective when determining missed-mate context.

This specification remains intentionally tunable for future calibration rounds.
## V0.2.4 calibration principle

The ordinary categories use the published Chess.com Classification V2 expected-points boundaries: Excellent <= 0.02, Good <= 0.05, Inaccuracy <= 0.10, Mistake <= 0.20, otherwise Blunder. Best/Great/Brilliant/Book/Miss use additional rules. Chess.com's exact rating-to-expected-points fit is not public, so the app uses a documented approximation rather than claiming byte-for-byte parity. PGN NAG annotations are ignored at runtime.
