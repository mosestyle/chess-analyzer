# Chess Analyzer 0.1.1 — usability and performance patch

This patch focuses on stabilizing Game Review before adding more V1 features.

## Fixed / improved

- Mobile/tablet Game Review now has compact **left/right arrow navigation directly below the chessboard**.
- Desktop Game Review constrains the board to the available viewport height and moves the review/comment card into the right-side panel, so the board and explanation are visible together on normal desktop screens.
- Opening Settings from an active Game Review now returns to the **same review screen and same move**, instead of resetting to the Analysis Complete summary.
- Full-game analysis uses lighter review presets plus a **two-pass pipeline**: MultiPV 1 for every position, then extra lines only for best-move candidates and important errors. This substantially reduces review time while keeping Full NNUE as the default engine.
- Piece movement now uses a forced two-frame transition so supported browsers visibly animate moves rather than batching the state change into an instant teleport.
- Replaced Unicode chess glyphs with the cleaner open-source **Cburnett Staunton SVG piece set**.
- Service-worker update handling was improved so new GitHub deployments are less likely to be hidden behind an old cached app shell.

## Recommended verification after deployment

1. On phone/tablet, open a review and confirm arrows sit immediately below the board.
2. On desktop, confirm the complete board and review comment are visible without page-length scrolling.
3. In review, move to (for example) move 12, open Settings, go Back, and confirm move 12 is still open.
4. Run the same PGN with Standard quality and compare analysis time with 0.1.0.
5. Step Previous/Next and confirm pieces slide smoothly.
6. Hard-refresh once after deployment if the old version is still visible; subsequent deployments should update more reliably.
