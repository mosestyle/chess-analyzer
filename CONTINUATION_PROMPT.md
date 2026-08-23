# Chess Analyzer — Continuation Prompt

**CURRENT VERSION: V0.3.1 — Calibration Framework**

> IMPORTANT FOR FUTURE UPDATES: Update this file whenever the project version, architecture, calibration workflow, unresolved bugs, or next planned milestone changes. This file is meant to be pasted into a new ChatGPT chat to continue the project without losing context.

## Paste this into a new chat

We are continuing development of my open-source **Chess Analyzer / Game Review** project. Please treat the information below as the current source of truth and continue from it rather than restarting the design.

### Product goal

Build a GitHub-hosted, responsive desktop/mobile/tablet chess analyzer that feels similar in usefulness to Chess.com Game Review, while remaining an independent implementation. Main focus is the analyzer. Secondary feature is Play vs Computer with Stockfish difficulty levels 1–12.

The user wants the move classifications and Accuracy to become **as close to Chess.com as reasonably possible for the right reasons**, not by hard-coding individual game answers.

### Hosting / server decision

- Keep the analyzer **local/browser based for now**.
- Do NOT move analysis to a server unless the user revisits that decision.
- GitHub Pages deployment currently works well.

### Engine options

- Stockfish 18 Full NNUE and Stockfish 18 Lite are both supported.
- Full NNUE is the preferred/default analyzer engine.
- Calibration/reference testing must use **Stockfish 18 Full NNUE + Standard**.

### Frozen Analyzer V2 engine profile

V0.3 introduced Analyzer Engine V2. Do not casually alter the Standard measurement profile during calibration:

- Stockfish 18 Full NNUE
- Standard full-game review: **48,000 nodes per position**
- MultiPV 1
- 16 MB hash
- one analysis pass per position
- small cooperative pause between positions
- **NO separate verification/re-analysis stage**

This replaced V0.2.1/V0.2.2's heavy `Verifying important position X of 10` stage, which caused large CPU-temperature spikes. Performance/thermals are currently much better and this part should remain frozen while calibrating labels.

### Why V0.3.1 exists

V0.2.x repeatedly hand-tuned thresholds. Fixing one game often broke another. V0.3 stabilized Stockfish measurements, but Game #3 still showed substantial label/Accuracy differences from Chess.com.

V0.3.1 therefore adds a proper calibration framework instead of another threshold patch.

### V0.3.1 calibration architecture

Runtime raw evidence is separated from the displayed label. Each reviewed move stores evidence including:

- FEN before/after
- Stockfish evaluation before/after
- best move
- played move
- centipawn loss
- win/expected-points loss
- rating used
- mate before/after
- legal move count
- engine-top flag
- book flag
- sacrifice candidate
- ordinary baseline category

Tunable parameters are centralized in:

`src/analysis/calibration-model.json`

Do not scatter new magic numbers across the classifier.

### Chess.com labelled data

Five calibration PGNs are stored in:

`tests/fixtures/calibration-games.json`

The Chess.com PGNs contain exact NAG annotations for important labels:

- `$1` = Great
- `$2` = Mistake
- `$4` = Blunder
- `$6` = Inaccuracy
- `$9` = Miss

These labels are **development/test ground truth only**. The runtime analyzer must never read them as answers. Best/Excellent/Good/Book and Accuracy targets come from the saved Chess.com summary data in the fixtures.

`npm run calibration:extract` creates the normalized exact reference file.

### Calibration export workflow

To gather raw Stockfish evidence from the deployed site:

1. Open the site with `?calibration=1` appended to the URL.
2. Analyze a known reference PGN with Full NNUE + Standard.
3. On Analysis Complete, use the development-only `Export calibration JSON` button.
4. Put the export into `calibration-data/features/`.

The website normally hides this button.

### Calibration scripts

- `npm run calibration:extract` — extract exact NAG labels/fingerprints from fixtures.
- `npm run calibration:benchmark` — benchmark the current model against available feature exports.
- `npm run calibration:fit` — deterministic automated parameter search.
- `npm run calibration:fit -- --iterations=3000` — larger fit.
- `npm run calibration:fit -- --iterations=3000 --apply` — apply only after validation improves.
- `npm run calibration:accept` — save accepted benchmark metrics.
- `npm run calibration:check` — detect future regression.
- `npm run calibration:import-chess-review -- <file>` — import third-party benchmark OUTPUT only.

The fitter performs **leave-one-game-out cross-validation**. Do not accept a model because one reference game gets closer if held-out games regress.

### Benchmark metrics

We care about:

- exact annotated-move label agreement
- precision/recall for Great, Inaccuracy, Mistake, Miss, Blunder
- summary-count MAE across all categories
- Accuracy MAE
- held-out/cross-validation results

Future model changes should be judged quantitatively.

### Chess-Review project

Reference project:
`T-Julsgaard/Chess-Review`

Use it as architectural/secondary benchmark inspiration, especially its calibration-oriented approach. Do **not** blindly copy its GPL source or calibration file into this project. V0.3.1 includes an importer for separately produced benchmark output only.

### Current five Chess.com reference summaries

Game #1 — Mosestyle vs Maria-BOT, 65 plies
- Accuracy: 77.7 / 68.8
- White: Brilliant 0, Great 0, Book 2, Best 10, Excellent 12, Good 4, Inaccuracy 4, Mistake 0, Miss 1, Blunder 0
- Black: Brilliant 0, Great 0, Book 1, Best 10, Excellent 2, Good 5, Inaccuracy 5, Mistake 9, Miss 0, Blunder 0

Game #2 — Maria-BOT vs Mosestyle, 25 plies
- Accuracy: 69.9 / 71.6
- White: 0,0,Book3,Best1,Excellent2,Good3,Inaccuracy3,Mistake1,Miss0,Blunder0
- Black: 0,0,Book3,Best5,Excellent1,Good0,Inaccuracy2,Mistake0,Miss0,Blunder1

Game #3 — Maria-BOT vs Mosestyle, 98 plies
- Accuracy: 34.7 / 40.6
- White: Brilliant 0, Great 1, Book 3, Best 9, Excellent 3, Good 5, Inaccuracy 11, Mistake 2, Miss 8, Blunder 6
- Black: Brilliant 0, Great 0, Book 2, Best 12, Excellent 5, Good 8, Inaccuracy 5, Mistake 4, Miss 7, Blunder 3

Game #4 — Maria-BOT vs Mosestyle, 76 plies
- Accuracy: 71.5 / 79.3
- White: 0,0,Book3,Best13,Excellent4,Good5,Inaccuracy6,Mistake5,Miss0,Blunder0
- Black: 0,0,Book2,Best13,Excellent9,Good11,Inaccuracy2,Mistake0,Miss1,Blunder0

Game #5 — Maria-BOT vs Mosestyle, 25 plies
- Accuracy: 57.5 / 31.8
- White: 0,0,Book4,Best4,Excellent0,Good0,Inaccuracy2,Mistake1,Miss1,Blunder1
- Black: 0,0,Book3,Best1,Excellent0,Good2,Inaccuracy1,Mistake1,Miss2,Blunder2

The exact PGNs are already in the fixture JSON; do not ask the user to retype them if the project files are available.

### Last known V0.3 Game #3 result (before calibration framework)

V0.3 Full NNUE + Standard produced roughly:
- Maria Accuracy 28.4; Great1, Best10, Excellent5, Good9, Book3, Inaccuracy2, Mistake5, Miss6, Blunder8
- Mosestyle Accuracy 30.8; Great2, Best13, Excellent8, Good7, Book2, Inaccuracy3, Mistake5, Miss5, Blunder4

This proved the stable engine pipeline worked but the interpretation model still needed objective calibration.

### UI/features already implemented

- PGN full-game review and FEN analysis
- Full NNUE / Lite selector
- Quick / Standard / Deep / Maximum quality
- responsive desktop/mobile/tablet layout
- modern SVG chess pieces
- smooth piece movement animation
- sound settings
- evaluation graph + graph toggle
- engine lines
- Show Best / Retry
- keyboard left/right navigation on desktop
- mobile arrows directly below the board
- settings returns to the exact review state
- Analysis Complete engine/quality badge
- opening/ECO metadata support
- Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss, Blunder
- Critical Moments and special tags
- Play vs Computer, difficulty 1–12, practice/hints/takeback/casual flows
- PWA/GitHub Pages deployment

### Current immediate next step

Do NOT make another manual threshold patch.

First gather V0.3.1 raw feature exports for the five saved reference games, then run the benchmark/fitter. Review leave-one-game-out results. Apply a fitted model only when held-out metrics improve. After accepting it, rerun the five games and compare to Chess.com.

### Continuation-file maintenance

Whenever you create V0.3.2, V0.4, etc., update this `CONTINUATION_PROMPT.md` with:

- new version
- architecture changes
- new benchmark/baseline metrics
- resolved/unresolved issues
- exact next step
- any changed user decisions

Do not let this file become stale.
