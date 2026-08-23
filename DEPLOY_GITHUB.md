# Upload and deploy on GitHub

## Easiest method

1. Create a new **public** GitHub repository, for example `chess-analyzer`.
2. Download/extract the ZIP supplied by ChatGPT.
3. Upload **the contents inside the extracted folder** to the root of the new repository. Do not upload the outer ZIP itself as the only file.
4. Commit the files to the `main` branch.
5. Open the repository on GitHub → **Settings** → **Pages**.
6. Under **Build and deployment**, set **Source** to **GitHub Actions**.
7. Open the repository's **Actions** tab. The workflow named **Build and deploy Chess Analyzer** should run automatically.
8. The first build can take longer because npm downloads Stockfish 18 Full NNUE.
9. When the workflow finishes, return to **Settings → Pages**. GitHub will show your public site URL.

Typical project-page URL:

`https://YOUR-GITHUB-NAME.github.io/chess-analyzer/`

## If the Actions build does not start

Open **Actions** → **Build and deploy Chess Analyzer** → **Run workflow**.

## If npm/Stockfish install fails temporarily

Re-run the workflow. The `stockfish@18.0.8` package contains the required files and the project's preparation script checks for:

- `stockfish-18-single.js`
- `stockfish-18-single.wasm`
- `stockfish-18-lite-single.js`
- `stockfish-18-lite-single.wasm`

## Local development

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Why the engine files are not in the Git repository

The Full NNUE WASM build is over 100 MB. Keeping it out of the repository avoids GitHub's normal source-file size limit. GitHub Actions downloads it as an npm dependency during the Pages build and places it into the deployment artifact.


## Updating an existing deployment

For an update such as 0.3.2, upload/commit the new project contents over the existing repository and keep the same GitHub Pages settings. The included GitHub Actions workflow will rebuild and redeploy automatically.

You can copy/replace the new project files over the existing repository; deleting everything first is not required. Because this patch changes the service-worker cache version, refresh the site once after the deployment finishes. If a browser still shows the old interface, close the installed PWA/tab and reopen it, or perform one hard refresh.
