import type { ReviewMove } from '../types';

export function EvaluationGraph({ moves, selected, onSelect }: { moves: ReviewMove[]; selected?: number; onSelect?: (index: number) => void }) {
  if (!moves.length) return null;
  const width = 720;
  const height = 160;
  const points = moves.map((move, index) => {
    const x = moves.length === 1 ? 0 : (index / (moves.length - 1)) * width;
    const normalized = Math.max(-700, Math.min(700, move.evalAfter));
    const y = height / 2 - (normalized / 700) * (height * 0.42);
    return { x, y, move, index };
  });
  const d = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return (
    <div className="graph-wrap">
      <svg className="eval-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Game evaluation graph">
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} className="graph-zero" />
        <path d={d} className="graph-line" />
        {points.map((point) => (
          <circle
            key={point.index}
            cx={point.x}
            cy={point.y}
            r={selected === point.index ? 7 : point.move.classification === 'Blunder' ? 5 : 3}
            className={`graph-dot dot-${point.move.classification.toLowerCase()}`}
            onClick={() => onSelect?.(point.index)}
          />
        ))}
      </svg>
    </div>
  );
}
