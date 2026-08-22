CHESS ANALYZER V1 — START HERE

1. Extract this ZIP.
2. Create a new PUBLIC GitHub repository (example: chess-analyzer).
3. Upload ALL files/folders inside the extracted chess-analyzer-v1 folder to the repository root.
   Important: include the hidden .github folder.
4. Commit to the main branch.
5. GitHub repository -> Settings -> Pages -> Source: GitHub Actions.
6. Open Actions and wait for "Build and deploy Chess Analyzer" to finish.
7. Your Pages URL will appear in Settings -> Pages.

You DO NOT need to manually add Stockfish files.
The GitHub Actions build downloads stockfish@18.0.8 and prepares:
- Stockfish 18 Full NNUE single-threaded
- Stockfish 18 Lite single-threaded

For local development:
  npm install
  npm run dev

Read DEPLOY_GITHUB.md for the full guide.
