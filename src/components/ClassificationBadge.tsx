import type { Classification } from '../types';

const META: Record<Classification, { symbol: string; className: string }> = {
  Brilliant: { symbol: '!!', className: 'brilliant' },
  Great: { symbol: '!', className: 'great' },
  Best: { symbol: '★', className: 'best' },
  Excellent: { symbol: '👍', className: 'excellent' },
  Good: { symbol: '✓', className: 'good' },
  Book: { symbol: '▤', className: 'book' },
  Inaccuracy: { symbol: '?!', className: 'inaccuracy' },
  Mistake: { symbol: '?', className: 'mistake' },
  Miss: { symbol: '✕', className: 'miss' },
  Blunder: { symbol: '??', className: 'blunder' },
};

export function ClassificationBadge({ value, compact = false }: { value: Classification; compact?: boolean }) {
  const meta = META[value];
  return <span className={`classification ${meta.className} ${compact ? 'compact' : ''}`}><b>{meta.symbol}</b>{compact ? null : <span>{value}</span>}</span>;
}
