# Classification specification — V0.3 Analyzer Engine V2

## Principle

Never tune summary counts directly. Every move is classified from stable raw evidence produced by one engine pass.

## Raw evidence

Each ReviewMove keeps:

- evalBefore / evalAfter
- mover centipawn loss
- mover win probability before / after
- win-probability loss
- engine #1 move match
- legal move count
- mate state
- sacrifice candidate
- player rating used by the Expected Points model
- ordinary baseline class

## Ordinary categories

V0.3 follows Chess.com's public Classification V2 Expected Points bands in percentage points of expected outcome lost:

- Excellent: <2
- Good: 2–5
- Inaccuracy: 5–10
- Mistake: 10–20
- Blunder: 20+

Book is determined before these categories. Best is the actual engine #1 move (or the only legal move).

## Relational categories

### Brilliant

A deliberately rare upgrade requiring:

- engine #1 move;
- <2 percentage-point loss;
- conservative board-based voluntary piece sacrifice;
- sound resulting position;
- not already trivially winning;
- recent opponent error or a mating continuation.

### Great

Requires the exact engine #1 move, a recent punishable opponent error, a meaningful new opportunity, and preservation of that opportunity.

### Miss

Requires a real previous opponent mistake/blunder (or an Inaccuracy that crosses a clear-advantage boundary), a measurable opportunity gain, and a current error that gives back a comparable amount. Losing a forced mate is a Miss.

### Contextual Mistake

An ordinary Inaccuracy can be promoted to Mistake when it loses at least ~1.2 pawns and crosses a clear ~2-pawn advantage/disadvantage boundary.

## NAGs

Imported Chess.com $1/$2/$4/$6/$9 annotations are never used at runtime to produce labels. They exist only as external regression references.
