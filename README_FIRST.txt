CHESS ANALYZER V0.3 — START HERE

This ZIP is the COMPLETE GitHub-ready project.

UPDATE AN EXISTING REPOSITORY
1. Keep the hidden .git folder in your local repository.
2. Delete the other old project files.
3. Copy everything from this V0.3 ZIP into the repository folder.
4. Open GitHub Desktop.
5. Commit: Update to V0.3
6. Push origin.
7. Wait for GitHub Actions / Pages to finish.
8. Hard-refresh the site once.

V0.3 IMPORTANT CHANGE
Full-game Analyzer Engine V2 has NO separate "Verifying important position" stage.
Standard uses one fixed 48,000-node Stockfish pass per position, MultiPV 1, plus a small cooperative pause to reduce sustained thermal load.

Start by re-running one known calibration game with:
Stockfish 18 Full NNUE + Standard

See UPDATE_NOTES_0.3.0.md and docs/ANALYZER_V2.md.
