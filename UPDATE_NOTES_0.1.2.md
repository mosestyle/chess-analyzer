# Chess Analyzer 0.1.2 — review navigation and summary polish

This patch continues the V1 stabilization pass before deeper analyzer calibration.

## Fixed / improved

- **Keyboard navigation:** Left Arrow / Right Arrow now move backward and forward through Game Review on desktop (and any device with a hardware keyboard). Typing inside an input/select/textarea is never intercepted.
- **Stable review layout:** long review explanations no longer push the chessboard and navigation controls farther down. The review comment area now has a consistent footprint and scrolls internally when necessary.
- **Desktop navigation stays reachable:** Previous/Next stays pinned to the bottom of the review side panel while scrolling that panel.
- **Optional review graph:** Settings → Review now has an `Evaluation graph during review` toggle. This controls the graph below Show best / Retry without removing the summary graph.
- **Compact Analysis Complete screen:** the desktop summary is now a two-column dashboard so the graph, accuracy/classification table, phase stats and Start review action use the viewport much more efficiently.
- **Start Review is surfaced earlier on mobile/tablet:** it now appears immediately after the summary hero instead of below every statistic.

## Recommended verification

1. Open Game Review on PC and use Left/Right keyboard arrows.
2. Find a move with a long explanation and verify the board/arrows do not shift vertically.
3. Settings → Review → disable `Evaluation graph during review`, then return to the same review move.
4. On desktop, confirm the Analysis Complete page is dramatically more compact and Start review is visible without scrolling on a normal-height display.
5. On mobile, confirm Start review appears near the top of the summary and the move arrows remain directly below the board.
