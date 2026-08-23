# Analysis specification — V0.2.4

> V0.2.4 calibration note: Standard classifications use the published 0.02 / 0.05 / 0.10 / 0.20 expected-points bands. The expected-points conversion is a rating-aware approximation centered on the 0.00368208 chess win-probability sigmoid. Standard keeps at most two ~120 ms special refinements; embedded PGN NAG annotations are never used to produce classifications.


For a PGN, reconstruct every position from the starting FEN. Stockfish scores are normalized to White in the engine layer, while classification and expected-score loss are evaluated from the mover's perspective.

PGN metadata includes White/Black names, ratings when present, ECO, Opening/Variation, and ECOUrl.

## Expected loss

For White:

`loss = expectedScore(before, White rating) - expectedScore(after, White rating)`

For Black, expected score is inverted and Black's rating is used.

The expected-score function saturates in already-decided positions so raw centipawn swings do not all receive the same practical severity.

## Primary review pass

Every position is analyzed with MultiPV 1 at the selected review depth.

- Quick: depth 9
- Standard: depth 12
- Deep: depth 15
- Maximum: depth 19

## Bounded optional verification

V0.2.3 removes the V0.2.2 Standard pattern where almost every game hit ten extra depth-15 searches.

### Quick

- no extra verification

### Standard

- maximum 2 extra checks
- ~180 ms search budget per check
- only mate ambiguity and plausible special-best (Great/Brilliant/Only Move) candidates
- ordinary error boundaries are finalized from the primary pass

### Deep

- maximum 6 extra checks
- ~450 ms each
- can also recheck important errors / classification boundaries

### Maximum

- maximum 10 extra checks
- ~900 ms each
- broader error/boundary verification

Time-bounded searches are used so CPU load is predictable. Deep and Maximum are intentionally heavier; Standard is designed for everyday desktop/mobile use.

## Classification calibration

Book is handled first. Best now requires a stable result rather than only a shallow `bestmove` match. The normal expected-loss bands are:

- Excellent <= 0.012
- Good <= 0.055
- Inaccuracy <= 0.105
- Mistake <= 0.20
- Blunder > 0.20

Great and Brilliant require stronger uniqueness/tactical evidence and MultiPV information.

## Miss

Miss is an override only when the opponent's immediately previous move made a real error that created a concrete opportunity, and the player then gives back a substantial amount of that opportunity. Blunders are not converted into Misses.

## Critical Moments

Candidate moments are ranked and capped by game length. This prevents long tactical games from labeling a large fraction of all moves as Critical.

## Accuracy

Move accuracy remains derived from rating-aware expected-score loss and constrained by final classification. Overall and phase accuracy use the geometric-heavy aggregation introduced in V0.2.1. V0.2.3 primarily improves the inputs to that calculation by correcting Best/Miss/error balance.

## Stored review information

Each review move stores FEN before/after, SAN/UCI, best move, lines, evaluation before/after, expected loss, classification, tags and deterministic explanation.

The GameReview also stores actual engine mode and quality so the summary can display e.g. `Stockfish 18 Full NNUE · Standard`.
