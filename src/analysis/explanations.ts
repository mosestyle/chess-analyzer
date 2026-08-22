import type { Classification, SpecialTag } from '../types';
import { uciToSan } from '../chess/helpers';

export function explainMove(args: {
  classification: Classification;
  tags: SpecialTag[];
  san: string;
  bestMove: string;
  fenBefore: string;
  beforeCp: number;
  afterCp: number;
}) {
  const bestSan = uciToSan(args.fenBefore, args.bestMove);
  if (args.tags.includes('Missed Mate')) return `There was a forced mating continuation here. ${bestSan} was the key move.`;
  if (args.tags.includes('Missed Win')) return `You had a large advantage, but ${args.san} let much of it slip away. ${bestSan} kept the winning chances.`;
  if (args.classification === 'Brilliant') return `${args.san} is a strong tactical idea that accepts apparent risk while preserving the best evaluation.`;
  if (args.classification === 'Great') return `${args.san} was an unusually important best move; the alternatives were noticeably worse.`;
  if (args.classification === 'Best') return `${args.san} matches Stockfish's top choice and keeps the position on its best course.`;
  if (args.classification === 'Book') return `${args.san} follows a known opening path and keeps a healthy position.`;
  if (args.classification === 'Excellent') return `${args.san} is very close to the engine's best choice. ${bestSan} was slightly more precise.`;
  if (args.classification === 'Good') return `${args.san} is a sound move, although ${bestSan} preserves a little more of the position.`;
  if (args.classification === 'Inaccuracy') return `${args.san} gives away some of your advantage. A better option was ${bestSan}.`;
  if (args.classification === 'Mistake') return `${args.san} changes the position significantly in your opponent's favor. ${bestSan} was much safer.`;
  if (args.classification === 'Miss') return `Your opponent gave you an opportunity, but ${args.san} missed the chance to punish it. ${bestSan} was stronger.`;
  return `${args.san} loses a large amount of winning or drawing chances. The stronger move was ${bestSan}.`;
}
