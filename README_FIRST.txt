CHESS ANALYZER V0.3.2 — START HERE

This ZIP is the COMPLETE GitHub-ready project.

UPDATE AN EXISTING REPOSITORY
1. Keep your existing repository and hidden .git folder.
2. Copy everything from this V0.3.2 ZIP into the repository folder.
3. When Windows asks, choose Replace the files in the destination.
4. You do NOT need to delete the old files first for this update.
5. Open GitHub Desktop.
6. Commit: Update to V0.3.2
7. Push origin.
8. Wait for GitHub Actions / Pages to finish.
9. Hard-refresh the site once.

V0.3.2 IMPORTANT CHANGE
The Stockfish measurement layer is unchanged: Standard remains one 48,000-node Stockfish 18 Full NNUE pass per position, MultiPV 1, and NO verification stage.

V0.3.2 applies the new data-calibrated two-stage classifier trained from the five V0.3.1 browser exports, plus a calibrated game-level Accuracy model.

DEVELOPMENT CALIBRATION MODE
Append ?calibration=1 to the deployed site URL to expose the calibration export button. Normal visitors do not see it.

See UPDATE_NOTES_0.3.2.md, CALIBRATION_RESULTS_V0.3.2.md, docs/DATA_CALIBRATED_CLASSIFIER.md, and CONTINUATION_PROMPT.md.
