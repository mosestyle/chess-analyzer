const OPENINGS: Array<{ name: string; moves: string[] }> = [
  { name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { name: 'French Defense', moves: ['e4', 'e6'] },
  { name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  { name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
  { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e6'] },
  { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'] },
  { name: 'English Opening', moves: ['c4'] },
  { name: 'Réti Opening', moves: ['Nf3'] },
  { name: 'Scandinavian Defense', moves: ['e4', 'd5'] },
  { name: 'Pirc Defense', moves: ['e4', 'd6'] },
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
  return OPENINGS.some((opening) => prefix.every((move, index) => opening.moves[index] === move));
}
