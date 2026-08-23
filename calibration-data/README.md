# Calibration data workspace

This folder is intentionally part of the repository structure, but large/raw exports are not generated automatically.

- `features/`: put browser calibration JSON exports here when expanding the corpus. The original five V0.3.1 exports have already been processed into the V0.3.2 model and derived test fixture.
- `generated/`: automatic fitted model candidates are written here.
- `reports/`: fit/benchmark reports are written here.
- `chess-review/`: optional secondary benchmark output imports (created when needed).
- `accepted-metrics.json`: created only after an accepted model baseline is recorded.

Do not put Chess-Review source code here. Only separately produced benchmark output may be imported.

See `docs/CALIBRATION_FRAMEWORK.md`.
