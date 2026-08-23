# Chess Analyzer V0.3 — Analyzer Engine V2

V0.3 replaces the unstable V0.2.x threshold-patching approach with a new analysis architecture.

## The main change: stable measurement first, labels second

Full-game review now runs one reproducible Stockfish pass per position. Standard uses a fixed node budget and MultiPV 1. There is no separate "Verifying important position" stage.

Why this matters:

- a faster PC finishes sooner but should not silently get a different depth target;
- the classifier sees the same kind of engine measurement every release;
- changing Miss/Great/Accuracy logic no longer changes the Stockfish search itself;
- Standard avoids the repeated deep-search CPU spikes introduced in V0.2.1/V0.2.2.

### V0.3 review budgets

- Quick: 18,000 nodes / position
- Standard: 48,000 nodes / position
- Deep: 140,000 nodes / position
- Maximum: 360,000 nodes / position

All full-game classification passes use one principal variation. Single-position/FEN analysis still uses the existing deeper interactive presets and can show multiple lines.

## Analyzer V2 raw features

Each move stores stable evidence separately from its displayed label:

- engine top move
- evaluation before/after
- centipawn loss from the mover's point of view
- win-probability before/after
- win-probability loss
- rating used for the expected-points conversion
- mate state
- legal-move count
- sacrifice candidate flag
- ordinary baseline category

The final Brilliant/Great/Miss logic is applied only after all moves have those features.

## Ordinary move categories

V0.3 follows Chess.com's publicly documented Expected Points bands:

- Excellent: <2 percentage points lost
- Good: 2–5
- Inaccuracy: 5–10
- Mistake: 10–20
- Blunder: 20+

Best is reserved for the engine's actual top move (or a forced move). This avoids the V0.2.x problem where "near enough" moves repeatedly moved in and out of Best between releases.

## Brilliant / Great / Miss

These are relational categories rather than extra global thresholds.

- Brilliant requires an exact engine-top move, a conservative board-based voluntary sacrifice, a sound resulting position, and usually a recent opponent error or mating idea.
- Great requires the exact engine-top move to capitalize meaningfully on a recent opponent error.
- Miss requires a real opponent error followed by failure to cash in a comparable opportunity. Missing a forced mate is also a Miss.

The implementation was designed independently after studying Chess.com's published Game Review descriptions and open-source calibration techniques. No Chess-Review source code is bundled or copied.

## Accuracy V2

Accuracy is now independent of the final move label. It is calculated from win-probability loss, then aggregated with robust means so lots of quiet moves cannot completely hide repeated serious errors. This also means changing a move from Mistake to Miss does not itself change the game's Accuracy.

## Chess-Review reference

The open-source T-Julsgaard/Chess-Review project was used as an architectural/reference benchmark because it demonstrates several valuable ideas: a frozen engine configuration, calibration as a separate layer, single-PV classification, and regression-driven tuning. V0.3 implements those concepts independently and does not include its GPL source code or calibration file.

## What to test

For the first V0.3 test, use Stockfish 18 Full NNUE + Standard and one of the five existing calibration PGNs. Confirm first that there is no second verification stage and that temperatures remain similar to the old fast V0.2.0 path. Then compare individual move labels, not only the summary totals.
