import { Chess } from 'chess.js';
import type { Classification, SpecialTag } from '../types';
import { lineToSan, uciToSan } from '../chess/helpers';

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

function firstPunishment(fenAfter: string, replyLine: string[]) {
  const uci = replyLine[0];
  if (!uci) return null;
  try {
    const chess = new Chess(fenAfter);
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!move) return null;
    return {
      san: move.san,
      captured: move.captured ? PIECE_NAMES[move.captured] : null,
      check: move.san.includes('+'),
      mate: move.san.includes('#'),
    };
  } catch {
    return null;
  }
}

export function explainMove(args: {
  classification: Classification;
  tags: SpecialTag[];
  san: string;
  bestMove: string;
  fenBefore: string;
  fenAfter: string;
  beforeCp: number;
  afterCp: number;
  replyLine?: string[];
}) {
  const bestSan = uciToSan(args.fenBefore, args.bestMove);
  const punishment = firstPunishment(args.fenAfter, args.replyLine || []);
  const reply = punishment?.san;

  if (args.tags.includes('Missed Mate')) {
    return `You had a forced mating continuation. ${bestSan} was the key move; ${args.san} lets the mating sequence disappear.`;
  }
  if (args.tags.includes('Missed Win')) {
    return `You had a winning position, but ${args.san} gave back much of the advantage. ${bestSan} kept the win under control.`;
  }
  if (args.classification === 'Brilliant') {
    return `${args.san} is a rare best move that accepts an apparent material risk for concrete compensation.`;
  }
  if (args.classification === 'Great') {
    return `${args.san} was an important best move. The main alternatives were noticeably worse, so finding it mattered.`;
  }
  if (args.classification === 'Best') {
    return `${args.san} matches Stockfish's top choice and keeps the position on its strongest course.`;
  }
  if (args.classification === 'Book') {
    return `${args.san} follows a known opening path and keeps the position in established theory.`;
  }
  if (args.classification === 'Excellent') {
    return `${args.san} is very close to the engine's best choice. ${bestSan} was only a little more precise.`;
  }
  if (args.classification === 'Good') {
    return `${args.san} is a sound move. ${bestSan} preserved slightly more of your winning or drawing chances.`;
  }

  if (args.tags.includes('Hanging Piece') && punishment?.captured) {
    return `${args.san} leaves material vulnerable. ${reply || 'Your opponent can respond immediately'} and capture your ${punishment.captured}; ${bestSan} avoids that.`;
  }
  if (punishment?.mate) {
    return `${args.san} allows ${reply}, which ends the game by force. ${bestSan} was necessary to avoid mate.`;
  }
  if (punishment?.captured && ['Mistake', 'Blunder'].includes(args.classification)) {
    return `${args.san} allows ${reply}, letting your opponent win a ${punishment.captured}. ${bestSan} was the safer choice.`;
  }
  if (args.tags.includes('Major Turning Point')) {
    return `${args.san} is a major turning point and gives away a large share of your winning or drawing chances. ${bestSan} was much stronger.`;
  }
  if (args.classification === 'Inaccuracy') {
    return `${args.san} gives away some of your advantage. ${bestSan} was a more precise way to handle the position.`;
  }
  if (args.classification === 'Mistake') {
    return `${args.san} changes the position significantly in your opponent's favor.${reply ? ` Stockfish's reply starts with ${reply}.` : ''} ${bestSan} was much safer.`;
  }
  if (args.classification === 'Miss') {
    return `Your opponent gave you a real opportunity, but ${args.san} missed it. ${bestSan} was the move that punished the mistake.`;
  }

  const continuation = lineToSan(args.fenAfter, args.replyLine || [], 2).join(' ');
  return `${args.san} loses a large amount of winning or drawing chances.${continuation ? ` The punishment begins ${continuation}.` : ''} ${bestSan} was the stronger move.`;
}
