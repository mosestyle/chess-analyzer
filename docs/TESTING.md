# Testing plan

Before a public V1 release, add a larger PGN/FEN regression corpus covering:

- best/excellent/good moves
- inaccuracies/mistakes/blunders
- missed mate and missed tactics
- sacrifices and Brilliant candidates
- forced/only moves
- checkmate/stalemate/draw
- castling, promotion and en passant
- long games
- unusual starting FENs

Cross-browser targets:
- Chrome / Edge / Firefox desktop
- Safari desktop
- Android Chrome
- Samsung Internet
- iOS Safari
- tablets in portrait and landscape

Performance checks:
- Full NNUE first-load time
- engine RAM usage
- long-PGN analysis time
- repeated Full ↔ Lite switching
- cancellation
- mobile heat/battery behavior
