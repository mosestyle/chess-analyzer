# Chess Analyzer V0.2.4 — Chess.com-style calibration

V0.2.4 is a stability/calibration release based on the five Full NNUE + Standard comparison games collected against Chess.com Game Review.

## Goal

Get the review distribution closer to Chess.com's public Classification V2 behavior without reading or trusting Chess.com NAG annotations at runtime. Embedded `$1/$2/$4/$6/$9` annotations in imported PGNs are ignored by the analyzer; they are useful only as development/calibration reference data.

## Standard classifications

V0.2.4 restores Chess.com's published expected-points boundaries exactly:

- Best: engine top / effectively equivalent move
- Excellent: <= 0.02 expected points lost
- Good: <= 0.05
- Inaccuracy: <= 0.10
- Mistake: <= 0.20
- Blunder: > 0.20

The prior V0.2.3 custom 0.012/0.055/0.105 boundaries were removed.

## Expected-points model

The evaluation-to-expected-score curve now uses the well-known 0.00368208 chess win-probability logistic as its center, with a mild player-rating adjustment. Lower-rated players use a flatter curve; stronger players use a steeper curve. This better handles both tactical swings near equality and additional errors in already-bad positions.

Chess.com's exact fitted rating curve is not public, so this remains an approximation rather than a claim of identical internals.

## Best / Excellent / Good

V0.2.2 marked every shallow engine first choice as Best; V0.2.3 became too strict. V0.2.4 uses a middle ground: an exact engine choice stays Best when the independently evaluated resulting position remains within a small expected-score tolerance. Near-identical alternatives can also be Best when MultiPV confirms the tie.

## Great

Great is no longer mostly a line-gap heuristic. It now favors the public Chess.com definition:

- losing -> approximately equal,
- approximately equal -> winning,
- or the only clearly good move.

The uniqueness requirement is slightly more generous at lower ratings.

## Brilliant

Brilliant remains intentionally rare. It requires a best/nearly-best move with a real piece-sacrifice signal, a non-losing resulting position, and a position that was not already trivially won.

## Miss

Miss was the largest calibration problem in V0.2.2/V0.2.3. V0.2.4 requires the immediately preceding opponent move to create a new winning opportunity (or a similarly large practical opportunity), then requires the current player to fail to retain it. A move can become Miss even when its underlying standard bucket was Blunder, but only when the newly-created-opportunity conditions are satisfied.

This is designed to move the distribution away from both extremes we observed:

- V0.2.2: too many Misses,
- V0.2.3: too few Misses and too many Blunders.

## Critical moments

Critical moments remain ranked, but the cap is slightly tighter: about 3 for short games and up to 8 for long games.

## Performance / thermals

The cool V0.2.3 Standard pipeline is retained. Standard never returns to the V0.2.1/V0.2.2 `10/10` deep-verification stage. It can perform at most two very short special-position refinements, now capped at about 120 ms each. Quick performs none. Deep/Maximum remain deliberately more expensive.

## Calibration workflow

The five supplied games remain our regression set. After deployment, rerun them with `Stockfish 18 Full NNUE · Standard` and compare the summary counts/accuracy to Chess.com. The goal is similarity across the set, not exact overfitting to one PGN.
