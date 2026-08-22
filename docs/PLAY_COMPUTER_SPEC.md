# Play Computer specification — V1

Twelve UI levels map to Stockfish `Skill Level` 0–20 plus a short move-time budget.

V1 mapping is in `src/play/difficulty.ts` and is expected to be calibrated through automated and human testing.

Target visible response bands:
- Levels 1–4: ~0.5–1.5 s
- Levels 5–8: ~0.7–2 s
- Levels 9–11: ~1–2.5 s
- Level 12: ~1–3 s

A small natural minimum response delay avoids instant-looking replies when the engine returns in a few milliseconds.

Practice Mode uses full-strength shallow analysis to judge the human move. The selected opponent difficulty does not judge the player's move.
