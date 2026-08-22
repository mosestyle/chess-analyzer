CHESS ANALYZER V0.2.0 — START HERE
BUILD-FIXED PACKAGE: includes the PlayPage TypeScript fix for the first V0.2 GitHub Actions failure.

UPDATING AN EXISTING GITHUB REPOSITORY
1. Extract this ZIP.
2. Open your existing local chess-analyzer repository folder.
3. Delete/replace the old project files, but DO NOT delete the hidden .git folder.
4. Copy ALL files/folders from this ZIP into that repository folder.
   Important: include the hidden .github folder.
5. Open GitHub Desktop, commit the changes, then Push origin.
6. Wait for the GitHub Pages Action to finish.
7. Hard-refresh the website once if an older cached build appears.

NEW REPOSITORY
1. Extract this ZIP.
2. Create a new PUBLIC GitHub repository (example: chess-analyzer).
3. Upload ALL files/folders to the repository root, including .github.
4. Commit to main.
5. GitHub repository -> Settings -> Pages -> Source: GitHub Actions.
6. Wait for "Build and deploy Chess Analyzer" to finish.

You DO NOT need to manually add Stockfish files.
The GitHub Actions build downloads stockfish@18.0.8 and prepares Full NNUE + Lite.

For local development:
  npm install
  npm run dev

See UPDATE_NOTES_0.2.0.md for this release's fixes and analyzer changes.
