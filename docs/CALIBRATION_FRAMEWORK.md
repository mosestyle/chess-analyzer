# V0.3.1 Calibration Framework

V0.3.1 deliberately freezes the V0.3 engine measurement layer and adds an objective calibration workflow around it. The goal is to stop changing hand-written thresholds by feel and instead accept model changes only when they improve labelled move data and held-out games.

## Frozen measurement profile

For the default Full NNUE + Standard full-game review:

- Stockfish 18 Full NNUE
- 48,000 nodes per position
- MultiPV 1
- 16 MB hash
- one pass only
- no verification / re-analysis stage

Do not change this profile while calibrating the model. A changed engine budget creates a new measurement distribution and requires a new calibration baseline.

## Primary reference data

The five reference PGNs live in `tests/fixtures/calibration-games.json`.

Chess.com NAGs are development labels only:

- `$1` -> Great
- `$2` -> Mistake
- `$4` -> Blunder
- `$6` -> Inaccuracy
- `$9` -> Miss

`npm run calibration:extract` generates `tests/fixtures/calibration-reference.json` with exact labelled plies, fingerprints, summary counts, and Chess.com accuracy targets.

The NAGs are NEVER read by `analyzePgn()` and NEVER affect a normal user's result.

For categories not encoded by those NAGs (Book, Best, Excellent, Good, Brilliant), the Chess.com summary counts remain useful aggregate targets.

## Raw feature export

To collect the stable Stockfish evidence for a reference game:

1. Open the deployed site with `?calibration=1` appended to the URL.
2. Analyze the reference PGN using **Stockfish 18 Full NNUE + Standard**.
3. On Analysis Complete, click **Export calibration JSON**.
4. Copy the downloaded JSON into `calibration-data/features/`.

The export includes, per move:

- FEN before/after
- SAN / UCI
- evaluation before/after
- centipawn loss
- player rating
- legal move count
- engine-top flag
- book flag
- sacrifice flag
- mate state
- current V0.3.1 predicted label
- development-only reference NAG/label when present

It also includes a deterministic PGN fingerprint so the scripts can automatically match it to the correct fixture.

## Benchmarking

Run:

```bash
npm run calibration:benchmark
```

Metrics include:

- exact match on NAG-labelled moves
- precision/recall for Great, Inaccuracy, Mistake, Miss, Blunder
- Chess.com summary count MAE across all categories
- Accuracy MAE
- per-game accuracy comparison

This is more informative than matching only summary totals.

## Automatic fitting

Run:

```bash
npm run calibration:fit
```

Optional search budget:

```bash
npm run calibration:fit -- --iterations=3000
```

The fitter performs deterministic parameter search over the calibration model and leave-one-game-out cross-validation. It writes:

- `calibration-data/generated/calibration-v2.1-fitted.json`
- `calibration-data/reports/latest-fit.md`

It does **not** overwrite the runtime model by default.

Only after the held-out metrics improve should a fitted model be applied:

```bash
npm run calibration:fit -- --iterations=3000 --apply
```

Then rerun typecheck/tests and the five reference games.

## Regression baseline

After a model is accepted:

```bash
npm run calibration:accept
```

This creates `calibration-data/accepted-metrics.json`.

Future changes can run:

```bash
npm run calibration:check
```

The check fails if exact labelled-move agreement materially drops, Accuracy MAE meaningfully rises, or summary-count MAE regresses.

## Chess-Review benchmark support

T-Julsgaard/Chess-Review is a useful secondary benchmark/reference. V0.3.1 does not copy its GPL source or calibration file.

If benchmark output is produced separately, it can be imported with:

```bash
npm run calibration:import-chess-review -- path/to/benchmark.json
```

This stores normalized benchmark output under `calibration-data/chess-review/`. Chess.com labelled PGNs remain the primary reference.

## Acceptance rule

Do not accept a model merely because one game looks better.

A candidate should improve the aggregate benchmark and the leave-one-game-out validation. If it fixes Game #3 but materially worsens a held-out Game #5, it should be rejected.
