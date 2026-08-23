CHESS ANALYZER V0.3.1 — START HERE

This ZIP is the COMPLETE GitHub-ready project.

UPDATE AN EXISTING REPOSITORY
1. Keep the hidden .git folder in your local repository.
2. Delete the other old project files.
3. Copy everything from this V0.3.1 ZIP into the repository folder.
4. Open GitHub Desktop.
5. Commit: Update to V0.3.1
6. Push origin.
7. Wait for GitHub Actions / Pages to finish.
8. Hard-refresh the site once.

V0.3.1 IMPORTANT CHANGE
The V0.3 engine profile remains frozen: Standard uses one 48,000-node Stockfish 18 pass per position and NO verification stage.
V0.3.1 adds the objective calibration framework: exact Chess.com NAG extraction for development only, raw feature export, automated fitting, cross-validation, metrics, and regression protection.

CALIBRATION MODE
Append ?calibration=1 to the deployed site URL. After analyzing a known reference game, Analysis Complete shows a development-only "Export calibration JSON" button.

See UPDATE_NOTES_0.3.1.md, docs/CALIBRATION_FRAMEWORK.md, and CONTINUATION_PROMPT.md.
