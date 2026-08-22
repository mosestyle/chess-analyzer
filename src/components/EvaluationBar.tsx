export function formatEval(cp: number, mate?: number) {
  if (mate) return `${mate > 0 ? 'M' : '-M'}${Math.abs(mate)}`;
  const pawns = cp / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

export function EvaluationBar({ cp, mate, vertical = true }: { cp: number; mate?: number; vertical?: boolean }) {
  const clamped = Math.max(-800, Math.min(800, cp));
  const whitePercent = 100 / (1 + Math.exp(-clamped / 180));
  return (
    <div className={`eval-bar ${vertical ? 'vertical' : 'horizontal'}`} aria-label={`Evaluation ${formatEval(cp, mate)}`}>
      <div className="eval-white" style={vertical ? { height: `${whitePercent}%` } : { width: `${whitePercent}%` }} />
      <span className="eval-label">{formatEval(cp, mate)}</span>
    </div>
  );
}
