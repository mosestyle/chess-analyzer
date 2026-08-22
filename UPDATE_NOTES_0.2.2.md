# Chess Analyzer 0.2.2 — thermal-friendly verification hotfix

V0.2.2 keeps the V0.2.1 five-game calibration model, but reduces the sustained CPU load introduced by the deeper verification pass.

## Why this hotfix exists

V0.2.1 improved the analyzer substantially, but `Standard` could spend a long time on **Verifying important position...**. The verifier re-searched every routine Best candidate and several broad tactical candidates at depth 17. With Full NNUE, that could keep a CPU core saturated continuously and cause laptops/desktops to boost to uncomfortable temperatures.

V0.2.2 changes the *work scheduler*, not the basic V0.2.1 rating-aware classification philosophy.

## Standard changes

- First pass remains depth 12, single-PV.
- Deeper verification is reduced from depth **17 → 15**.
- Deeper verification is capped at **10 positions** per game.
- Routine Best moves are no longer automatically re-searched.
- Best moves are rechecked with MultiPV only when they are plausible Great/Brilliant/Only-Move candidates.
- Non-best moves are rechecked mainly when they are near a classification boundary, produce a meaningful practical swing, involve a mate transition, or are already a major expected-score error.
- Large errors normally use MultiPV 1; MultiPV 2 is reserved for cases where the alternatives can actually change the label.
- A **160 ms idle/cool-down gap** is inserted between Standard verification searches.
- Analysis hash is reduced from 24 MB to 16 MB for the full-game review worker.

## Other quality presets

- Quick: verify depth 11, maximum 4 positions.
- Deep: verify depth 18, maximum 14 positions.
- Maximum: verify depth 21, maximum 20 positions.

Deep and Maximum are intentionally more CPU intensive. Standard is the recommended everyday setting.

## Game #5 calibration result from V0.2.1

Before this thermal hotfix, the fifth calibration game already showed that the V0.2.1 accuracy rewrite moved strongly toward the reference result:

- Chess.com: Maria 57.5 / Mosestyle 31.8
- V0.2: Maria 75.1 / Mosestyle 64.7
- V0.2.1: Maria 53.6 / Mosestyle 42.7

The new calibration therefore stays in place. V0.2.2 is primarily about making selective verification practical enough to use on real hardware.

## What to test

1. Run the same short Game #5 with **Full NNUE + Standard**.
2. Watch whether the `Verifying key position...` phase is substantially shorter and whether CPU temperature settles sooner.
3. Compare the resulting classifications/accuracy with V0.2.1. Some changes are expected because fewer/depth-15 rechecks are being used.
4. If Standard is still too demanding on a particular machine, use Quick temporarily and report the hardware/browser plus the verification count shown on screen.
