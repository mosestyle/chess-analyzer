# Calibration data workspace

This folder is intentionally part of the repository structure, but large/raw exports are not generated automatically.

- `features/`: put V0.3.1 browser calibration JSON exports here.
- `generated/`: automatic fitted model candidates are written here.
- `reports/`: fit/benchmark reports are written here.
- `chess-review/`: optional secondary benchmark output imports (created when needed).
- `accepted-metrics.json`: created only after an accepted model baseline is recorded.

Do not put Chess-Review source code here. Only separately produced benchmark output may be imported.

See `docs/CALIBRATION_FRAMEWORK.md`.
