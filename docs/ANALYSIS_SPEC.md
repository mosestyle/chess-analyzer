# Analysis specification — V0.3 Analyzer Engine V2

## Full-game review

The review engine is deliberately deterministic in *work budget* rather than target depth.

For each position:

- Stockfish 18 (Full NNUE by default; Lite selectable)
- single browser worker
- one principal variation for classification
- fixed node budget selected by Quality
- 16 MB hash
- no second verification/re-analysis stage

### Budgets

| Quality | Nodes / position | Pause |
|---|---:|---:|
| Quick | 18,000 | 12 ms |
| Standard | 48,000 | 24 ms |
| Deep | 140,000 | 18 ms |
| Maximum | 360,000 | 12 ms |

The node budget is part of the calibration contract. A future change to these values must trigger a new benchmark pass.

## Why V0.3 removed verification

V0.2.1–V0.2.2 added deep verification of selected positions. It improved some labels but created CPU-temperature spikes and, more importantly, made the classifier consume a mixture of shallow and deeper measurements. V0.3 uses one consistent measurement source instead.

## Single-position FEN analysis

Interactive FEN analysis remains separate and uses depth + MultiPV presets because the user explicitly asked to inspect one position. It does not define full-game classification calibration.

## Terminal positions

Checkmate and draw positions are scored from board state rather than relying on an engine search with no legal moves.

## Metadata

PGN WhiteElo / BlackElo feed the rating-aware Expected Points approximation. ECO/ECOUrl metadata remains available for opening naming and Book detection.
