# Analyzer Engine V2

## Purpose

Analyzer Engine V2 makes the analysis pipeline reproducible and testable. The engine measurement layer is frozen; move labels and Accuracy are downstream models.

## Pipeline

1. Parse PGN and ratings.
2. Rebuild every position.
3. Analyze every position exactly once with the selected fixed review budget.
4. Store raw per-move evidence.
5. Apply ordinary Expected Points categories.
6. Apply relational Brilliant / Great / Miss / mate rules.
7. Build explanations and critical moments.
8. Calculate Accuracy from raw win-probability losses.

## Standard engine contract

Stockfish 18 Full NNUE is the default. Standard full-game review uses:

- single-threaded browser Stockfish build;
- 48,000 nodes per non-terminal position;
- MultiPV 1;
- 16 MB hash;
- 24 ms cooperative pause between positions;
- no verification/re-analysis stage.

The exact budget is part of the model contract. If it changes, calibration results must be revalidated.

## Why fixed nodes

Depth is not a fixed amount of work. Different positions and devices can reach a given depth with very different node counts. Fixed nodes keeps the amount of chess search per position stable while allowing faster hardware to finish sooner.

## Classification

The ordinary category ladder uses win-probability loss. Best is only the engine's #1 move (plus forced single-legal-move positions). Brilliant, Great and Miss are relational/contextual classifiers.

## Accuracy

Accuracy is deliberately independent of the displayed label. It uses move-level win-probability loss, a smooth move-score curve and robust game aggregation. This prevents a semantic relabel (for example Mistake -> Miss) from changing the numerical evidence underneath it.

## Calibration references

- Chess.com public Game Review / Classification V2 documentation is the primary behavioral reference.
- T-Julsgaard/Chess-Review is an architectural benchmark for reproducible local calibration and regression testing.
- The five supplied comparison PGNs remain the first validation corpus.

V0.3 does not import or execute Chess-Review code and does not use embedded Chess.com NAGs at runtime.
