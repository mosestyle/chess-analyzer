const OPENINGS: Array<{ name: string; moves: string[] }> = [
  { name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { name: 'Ruy Lopez: Morphy Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'] },
  { name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { name: 'Italian Game: Giuoco Piano', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'] },
  { name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
  { name: 'Four Knights Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'] },
  { name: 'Petrov Defense', moves: ['e4', 'e5', 'Nf3', 'Nf6'] },
  { name: "King's Gambit", moves: ['e4', 'e5', 'f4'] },
  { name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { name: 'Sicilian Defense: Open', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'] },
  { name: 'Sicilian Defense: Najdorf', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  { name: 'French Defense', moves: ['e4', 'e6'] },
  { name: 'French Defense: Advance', moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },
  { name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  { name: 'Caro-Kann Defense: Classical', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'] },
  { name: 'Scandinavian Defense', moves: ['e4', 'd5'] },
  { name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'] },
  { name: 'Modern Defense', moves: ['e4', 'g6', 'd4', 'Bg7'] },
  { name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
  { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e6'] },
  { name: "Queen's Gambit Accepted", moves: ['d4', 'd5', 'c4', 'dxc4'] },
  { name: 'Slav Defense', moves: ['d4', 'd5', 'c4', 'c6'] },
  { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'] },
  { name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
  { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { name: 'Grünfeld Defense', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'] },
  { name: 'Dutch Defense', moves: ['d4', 'f5'] },
  { name: 'London System', moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'] },
  { name: 'English Opening', moves: ['c4'] },
  { name: 'English Opening: Symmetrical', moves: ['c4', 'c5'] },
  { name: 'Réti Opening', moves: ['Nf3'] },
  { name: 'Réti Opening: King\'s Indian Attack', moves: ['Nf3', 'd5', 'g3', 'Nf6', 'Bg2'] },
];

export function detectOpening(sans: string[]) {
  let best = 'Unknown opening';
  let bestLength = 0;
  for (const opening of OPENINGS) {
    if (opening.moves.length > sans.length) continue;
    if (opening.moves.every((move, index) => sans[index] === move) && opening.moves.length > bestLength) {
      best = opening.name;
      bestLength = opening.moves.length;
    }
  }
  return best;
}

export function isLikelyBookMove(sans: string[], plyIndex: number) {
  const prefix = sans.slice(0, plyIndex + 1);
  return OPENINGS.some((opening) => prefix.length <= opening.moves.length && prefix.every((move, index) => opening.moves[index] === move));
}
