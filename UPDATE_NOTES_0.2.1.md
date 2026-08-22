# Chess Analyzer 0.2.1 — five-game analyzer calibration

V0.2.1 is the first calibration release built from a consistent comparison set of five real games analyzed with **Stockfish 18 Full NNUE + Standard** in this project and compared against Chess.com Game Review summaries.

It does **not** attempt to copy Chess.com's private implementation. The goal is to make our local review more internally consistent, less generous, and more robust while keeping the rules documented and testable.

## What changed

### Rating-aware expected score

PGN `WhiteElo` / `BlackElo` headers are now read and used by the expected-score conversion. If a rating is missing, the analyzer uses a neutral 1200 fallback.

This helps the same centipawn change reflect game context more realistically instead of using one fixed curve for every player.

### Selective deeper verification

Standard still starts with the fast full-game pass, but important positions are now rechecked substantially deeper.

Standard:

- first pass: depth 12, MultiPV 1
- verification: depth 17
- MultiPV 2 where alternatives matter

The verification set includes:

- Best/Great/Brilliant candidates
- ambiguous non-best moves
- meaningful expected-score losses
- large evaluation swings
- mate-related positions
- moves that leave the moved piece immediately capturable

The position after the move is also rechecked when needed so the final expected-loss calculation does not mix a deep pre-move score with a shallow post-move score.

### Best / Excellent calibration

V0.2 systematically produced too many `Excellent` labels and too few `Best` labels in several calibration games.

V0.2.1 therefore:

- verifies Best candidates more deeply
- treats numerically indistinguishable alternatives as equivalent Best moves when the score difference is effectively zero
- keeps the ordinary expected-loss ladder for non-best moves

### Great and Brilliant are stricter

`Great` now needs:

- the actual top engine move
- a large expected-score gap to the second line
- a position where the result is still meaningfully in play

`Brilliant` remains intentionally rare and additionally requires a real material-risk/sacrifice signal.

### Critical moments are less noisy

Critical Moment / Major Turning Point / Only Move thresholds were tightened so long tactical games do not mark an excessive fraction of moves as critical.

### Miss detection recalibrated

The Full-NNUE calibration set showed V0.2 was slightly under-counting Misses overall. V0.2.1 detects a Miss from the actual opportunity swing created by the opponent, then checks that the player gave a meaningful part of the opportunity back.

### Accuracy rewritten

V0.2's arithmetic-heavy accuracy calculation was consistently too high, sometimes by more than 30 points in error-filled games.

V0.2.1 now uses:

- a more punitive expected-loss-to-move-accuracy curve
- classification-aware maximum move scores for Inaccuracy/Mistake/Miss/Blunder
- a geometric-heavy game aggregation so repeated serious mistakes cannot be hidden by many trivial/forced moves
- the same aggregation for opening/middlegame/endgame accuracy

This is still our own score and should be treated as a calibration model, not an exact clone of another service.

### Better opening metadata and Book coverage

When available, PGN opening metadata is now preferred:

- `Opening`
- `Variation`
- `ECOUrl`
- `ECO`

The local opening table was also expanded for the five calibration-game families, including:

- French Defense: Queen's Knight Variation
- Ponziani Opening: Jaenisch-Neumann Gambit
- King's Gambit early queen-check line
- Italian Game two-knights/open-center line

This improves both the displayed opening name and early Book labels.

### Analysis Complete now shows the analysis configuration

A compact badge is shown beside **ANALYSIS COMPLETE**, for example:

`Stockfish 18 Full NNUE · Standard`

This makes future comparison screenshots self-describing.

## Calibration corpus

See `docs/CALIBRATION.md` for the five-game summary targets used to identify V0.2's recurring problems.

## What to test after deployment

Re-run the same five PGNs using:

- **Stockfish 18 Full NNUE**
- **Standard**

Compare:

1. White/Black Accuracy
2. Best vs Excellent distribution
3. Mistake/Blunder severity
4. Great false positives
5. Miss counts
6. Book counts/opening names
7. number of Critical Moments
8. total analysis time

V0.2.1 should be treated as a new baseline. A second calibration pass should use the before/after results from these exact same games before collecting a much larger corpus.
