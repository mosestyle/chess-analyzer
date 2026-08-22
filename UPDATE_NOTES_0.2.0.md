# Chess Analyzer 0.2.0 — analyzer intelligence + fixed desktop review layout

V0.2 is the first analyzer-quality release. It also fixes the desktop Game Review layout issue where longer commentary or extra engine lines moved the Previous/Next controls vertically.

## Desktop Game Review layout fix

The right-side review panel now uses a fixed board-height grid:

- Commentary has a fixed slot and scrolls internally when needed.
- Show best / Retry stay in a fixed slot.
- Engine lines have their **own scrollable area** and can no longer push navigation downward.
- The optional evaluation graph has a fixed slot.
- Previous / Next are anchored to the bottom of the review panel at the same vertical position on every move.
- Turning off the review graph gives the engine-lines area more breathing room without moving navigation.

Keyboard Left / Right navigation from 0.1.2 remains supported.

## Analyzer improvements

### More stable move classifications
V0.2 classifies non-best moves from expected-score loss bands:

- Excellent: <= 0.02
- Good: <= 0.05
- Inaccuracy: <= 0.10
- Mistake: <= 0.20
- Blunder: > 0.20

The expected-score conversion is our own model and is intentionally isolated for future calibration.

### Better Brilliant / Great handling

- Forced moves are no longer promoted to Great merely because there is no legal alternative.
- Great now requires a larger, meaningful gap to the second engine line.
- Brilliant is intentionally rare and requires a best move with an apparent material sacrifice/risk, preserved result, and meaningful alternative gap.

### Better special tags

- Critical Moment is less noisy.
- Major Turning Point requires a genuinely large result swing.
- Missed Mate now works correctly for **both White and Black**.
- Only Move / Winning Sacrifice / Missed Win remain separate tags from the main classification.

### Better Miss detection

A move is no longer called a Miss simply because it follows an opponent Mistake/Blunder. V0.2 checks whether the opponent actually handed over a meaningful increase in expected score, and whether the player then gave that opportunity back.

### Better explanations

The deterministic explanation layer can now inspect the opponent's principal reply after an error. When possible it can mention:

- immediate material capture
- a mating reply
- a major turning point
- missed mate / missed win
- the concrete first punishment move

This makes comments less generic while remaining fully local with no paid AI API.

### Better accuracy / phase accuracy

- Accuracy now penalizes large expected-score losses more progressively.
- A small weight is given to the worst quarter of moves so genuine collapses do not disappear inside a long game.
- Opening/middlegame/endgame grouping now also looks at board material instead of only fixed move-number cutoffs.

### Better opening recognition

The local opening table now includes more common openings and several common sub-variations, allowing more realistic Book labels during the first part of a game.

## Analysis refinement

The fast first-pass architecture remains. V0.2 performs extra MultiPV refinement on:

- best-move candidates
- mate candidates
- major errors losing >= 0.10 expected score

This improves classification reliability without returning to expensive MultiPV analysis on every position.

## Recommended verification

1. On desktop, compare a short comment/one engine line with a long comment/two or three engine lines. Previous/Next should stay at the **same height**.
2. Disable Settings → Review → Evaluation graph during review. Navigation should still stay in the same bottom slot.
3. Use Left/Right keyboard arrows through several review moves.
4. Re-analyze a game you already used in 0.1.x and compare classification counts/accuracy.
5. Check a game where Black has or misses a forced mate; Missed Mate should now be color-correct.
6. Check that Great/Brilliant are less common and feel more meaningful.

## Important

These remain **our own analyzer rules**, not Chess.com's proprietary Game Review or Accuracy implementation. V0.2 is a stronger calibration baseline that we can continue tuning with real PGNs.
