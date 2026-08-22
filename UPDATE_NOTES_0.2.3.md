# Chess Analyzer V0.2.3 — Calibration + Cool Standard

V0.2.3 is based on the five-game Full NNUE + Standard comparison set (289 reviewed plies) and the V0.2.2 thermal tests.

## Standard analysis no longer does 10 heavy verification searches

V0.2.2 Standard frequently hit its hard cap and displayed `Verifying key position X of 10` on nearly every game. Even with a lower depth, those searches caused visible CPU-temperature spikes.

V0.2.3 changes the design:

- Standard primary review remains depth 12 / MultiPV 1.
- Standard performs at most **2** extra checks.
- Extra checks are **time bounded to ~180 ms each**, rather than searching to depth 15.
- Standard only considers mate ambiguity or plausible Great/Brilliant/Only-Move candidates for the extra pass.
- Ordinary Inaccuracy/Mistake/Blunder boundaries are no longer re-searched in Standard.
- Quick performs **no** extra verification.
- Deep and Maximum retain progressively stronger verification because the user explicitly selected a heavier preset.

The goal is to return Standard to approximately the V0.2.0 speed/temperature character while keeping the rating-aware V0.2.x interpretation model.

## Best inflation reduced

Across the five V0.2.2 calibration games, the project produced 106 Best moves versus 78 in the reference summaries. A shallow `bestmove` match is no longer automatically enough for Best.

V0.2.3:

- keeps forced moves as Best;
- requires an exact first-PV move to preserve essentially all expected score;
- makes equivalent-alternative Best much stricter and requires MultiPV evidence;
- lets unstable shallow best moves fall through to Excellent / Good / error bands.

## Excellent / Good balance

Excellent was still too common while Good was under-counted. The top quality bands are now:

- Excellent: expected-score loss <= 0.012
- Good: <= 0.055
- Inaccuracy: <= 0.105
- Mistake: <= 0.20
- Blunder: > 0.20

These thresholds are applied after Book / Best / Great / Brilliant handling.

## Miss is much stricter

V0.2.2 produced 34 Misses across the five calibration games versus 20 in the reference set, while Mistake was under-counted.

A Miss now requires all of the following:

- the opponent's immediately preceding move was a genuine Inaccuracy/Mistake/Blunder;
- that move created a meaningful practical opportunity;
- the current player gives back a substantial share of that opportunity;
- the current base label is Inaccuracy or Mistake;
- a Blunder remains a Blunder;
- a previous Miss cannot automatically create a chain of Miss labels.

## Critical Moments are capped and ranked

Chaotic games could previously receive dozens of Critical Moment tags (for example 35 in a 98-ply calibration game).

V0.2.3 ranks candidate moments by error severity, turning-point/mate tags, uniqueness and expected-score loss, then keeps a length-scaled maximum:

- short games: about 3
- normal games: about 5–7
- long games: up to 10

## What remains independent

This project still uses its own classification and accuracy model. The calibration games are references used to identify systematic behavior, not a promise to reproduce another site's private algorithms exactly.

## Recommended retest

Use the same five PGNs with:

- Stockfish 18 Full NNUE
- Standard

Check:

1. Standard no longer runs `X of 10` verification.
2. CPU temperature stays much closer to the primary-pass behavior.
3. Best count decreases.
4. Good / Mistake recover.
5. Miss count decreases.
6. Critical Moment count becomes useful rather than noisy.
