import { Chess } from 'chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function moveToUci(move: { from: string; to: string; promotion?: string }) {
  return `${move.from}${move.to}${move.promotion || ''}`;
}

export function uciToSan(fen: string, uci: string) {
  try {
    const chess = new Chess(fen);
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return move?.san || uci;
  } catch {
    return uci;
  }
}

export function lineToSan(fen: string, pv: string[], max = 8) {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (!move) break;
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return sans;
}

export function materialValue(chess: Chess, color: 'w' | 'b') {
  const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let total = 0;
  for (const row of chess.board()) {
    for (const piece of row) if (piece && piece.color === color) total += value[piece.type] || 0;
  }
  return total;
}

export function movedPieceIsEnPrise(fenAfter: string, destination: string) {
  try {
    const chess = new Chess(fenAfter);
    return chess.moves({ verbose: true }).some((m) => m.to === destination && Boolean(m.captured));
  } catch {
    return false;
  }
}
