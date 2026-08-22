import { useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { ChessBoard, type BoardMove } from '../components/ChessBoard';
import { ClassificationBadge } from '../components/ClassificationBadge';
import { EvaluationBar, formatEval } from '../components/EvaluationBar';
import { EvaluationGraph } from '../components/EvaluationGraph';
import { lineToSan, uciToSan } from '../chess/helpers';
import { playChessSound } from '../services/sound';
import { phaseAccuracies } from '../analysis/accuracy';
import type { Classification, GameReview, Settings } from '../types';

const ORDER: Classification[] = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Mistake', 'Miss', 'Blunder'];
type ReviewView = 'summary' | 'review';

export function ReviewPage({ review, settings, view, onViewChange, index, onIndexChange, onBack, onSettings }: {
  review: GameReview;
  settings: Settings;
  view: ReviewView;
  onViewChange: (view: ReviewView) => void;
  index: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  onSettings: () => void;
}) {
  const [showBest, setShowBest] = useState(false);
  const [retry, setRetry] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');

  const safeIndex = Math.max(0, Math.min(review.moves.length - 1, index));
  const current = review.moves[safeIndex];
  const whitePhases = useMemo(() => phaseAccuracies(review.moves, 'w'), [review.moves]);
  const blackPhases = useMemo(() => phaseAccuracies(review.moves, 'b'), [review.moves]);
  const arrow = showBest && current.bestMove && current.bestMove !== '(none)'
    ? { from: current.bestMove.slice(0, 2), to: current.bestMove.slice(2, 4) }
    : null;

  const boardFen = (showBest || retry) ? current.fenBefore : current.fenAfter;
  const lastMove = (!showBest && !retry) ? { from: current.uci.slice(0, 2), to: current.uci.slice(2, 4) } : null;
  const bestSan = useMemo(() => uciToSan(current?.fenBefore || review.startFen, current?.bestMove || ''), [current, review.startFen]);

  function jump(next: number) {
    const safe = Math.max(0, Math.min(review.moves.length - 1, next));
    onIndexChange(safe);
    setShowBest(false);
    setRetry(false);
    setRetryMessage('');
    const move = review.moves[safe];
    const good = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book'].includes(move.classification);
    playChessSound(good ? 'reviewGood' : 'reviewBad', settings.sound && settings.reviewSounds, settings.volume);
  }

  async function retryMove(move: BoardMove) {
    const uci = `${move.from}${move.to}${move.promotion || ''}`;
    if (uci === current.bestMove) {
      setRetryMessage(`✓ Correct — ${bestSan} is the best move.`);
      playChessSound('reviewGood', settings.sound && settings.reviewSounds, settings.volume);
      window.setTimeout(() => {
        setRetry(false);
        setShowBest(true);
      }, 550);
      return true;
    }
    setRetryMessage('Not quite. Try again, ask for a hint, or show the best move.');
    playChessSound('reviewBad', settings.sound && settings.reviewSounds, settings.volume);
    return false;
  }

  const reviewCard = (
    <div className="review-card panel">
      <div className="review-card-head">
        <ClassificationBadge value={current.classification} />
        <span className="move-title">{current.moveNumber}{current.color === 'b' ? '…' : '.'} {current.san}</span>
        <span className="eval-chip">{formatEval(current.evalAfter)}</span>
      </div>
      {settings.showCriticalMoments && current.tags.length > 0 && (
        <div className="tag-row">{current.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      )}
      <p>{current.explanation}</p>
      {showBest && <p className="best-copy"><strong>Best:</strong> {bestSan} · {lineToSan(current.fenBefore, current.bestLine).join(' ')}</p>}
      {retry && <div className="retry-banner"><strong>Retry:</strong> Find the best move.{retryMessage && <span>{retryMessage}</span>}</div>}
    </div>
  );

  if (view === 'summary') {
    return (
      <main className="page review-page">
        <AppHeader title="Game Review" onBack={onBack} right={<button className="icon-button" onClick={onSettings}>⚙</button>} />
        <section className="summary-hero panel">
          <p className="eyebrow">ANALYSIS COMPLETE</p>
          <h2>{review.whiteName} vs {review.blackName}</h2>
          <p>{review.opening}</p>
          <EvaluationGraph moves={review.moves} onSelect={(i) => { onIndexChange(i); onViewChange('review'); }} />
        </section>

        <section className="panel score-card">
          <div className="score-head">
            <div><span>White</span><strong>{review.whiteName}</strong><b>{review.whiteAccuracy}</b></div>
            <div className="versus">Accuracy</div>
            <div><span>Black</span><strong>{review.blackName}</strong><b>{review.blackAccuracy}</b></div>
          </div>
          <div className="classification-table">
            {ORDER.map((name) => (
              <div className="classification-row" key={name}>
                <strong>{review.counts.white[name]}</strong>
                <ClassificationBadge value={name} />
                <strong>{review.counts.black[name]}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel summary-details">
          <div><span>Opening</span><strong>{review.opening}</strong></div>
          <div><span>Critical moments</span><strong>{review.moves.filter((m) => m.tags.includes('Critical Moment')).length}</strong></div>
          <div><span>Moves reviewed</span><strong>{review.moves.length}</strong></div>
        </section>

        <section className="panel phase-card">
          <h3>Game phase accuracy</h3>
          <div className="phase-grid">
            <span></span><strong>{review.whiteName}</strong><strong>{review.blackName}</strong>
            <span>Opening</span><b>{whitePhases.opening ?? '—'}</b><b>{blackPhases.opening ?? '—'}</b>
            <span>Middlegame</span><b>{whitePhases.middlegame ?? '—'}</b><b>{blackPhases.middlegame ?? '—'}</b>
            <span>Endgame</span><b>{whitePhases.endgame ?? '—'}</b><b>{blackPhases.endgame ?? '—'}</b>
          </div>
        </section>

        <button className="primary full-width sticky-action" onClick={() => onViewChange('review')}>Start review</button>
      </main>
    );
  }

  return (
    <main className="page review-page active-review">
      <AppHeader title="Game Review" onBack={() => onViewChange('summary')} right={<button className="icon-button" onClick={onSettings}>⚙</button>} />

      <div className="review-layout">
        <section className="review-board-column">
          <div className="mobile-review-card">{reviewCard}</div>

          <div className="board-with-eval large">
            {settings.showEvaluation && <EvaluationBar cp={showBest ? current.evalBefore : current.evalAfter} />}
            <ChessBoard
              fen={boardFen}
              settings={settings}
              interactive={retry}
              onMove={retryMove}
              lastMove={lastMove}
              arrow={arrow}
            />
          </div>

          <div className="board-step-nav" aria-label="Move navigation">
            <button aria-label="Previous move" disabled={safeIndex === 0} onClick={() => jump(safeIndex - 1)}>←</button>
            <span>{safeIndex + 1} / {review.moves.length}</span>
            <button aria-label="Next move" disabled={safeIndex === review.moves.length - 1} onClick={() => jump(safeIndex + 1)}>→</button>
          </div>

          <div className="move-strip" aria-label="Move list">
            {review.moves.slice(Math.max(0, safeIndex - 3), Math.min(review.moves.length, safeIndex + 4)).map((move) => {
              const moveIndex = move.ply - 1;
              return <button key={move.ply} className={moveIndex === safeIndex ? 'active' : ''} onClick={() => jump(moveIndex)}>{move.moveNumber}{move.color === 'b' ? '…' : '.'}{move.san}</button>;
            })}
          </div>
        </section>

        <aside className="review-side panel">
          <div className="desktop-review-card">{reviewCard}</div>

          <div className="review-actions">
            <button className="secondary" onClick={() => { setRetry(false); setShowBest((v) => !v); }}>{showBest ? 'Show played' : 'Show best'}</button>
            <button className="secondary" onClick={() => { setShowBest(false); setRetry(true); setRetryMessage(''); }}>Retry</button>
            {retry && <button className="ghost" onClick={() => { setRetry(false); setShowBest(true); }}>Hint / answer</button>}
          </div>

          {settings.showEngineLines && (
            <div className="engine-lines-panel">
              <h3>Engine lines</h3>
              {current.alternatives.map((line) => (
                <div className="engine-line" key={line.multipv}>
                  <strong>{line.multipv}. {formatEval(line.scoreCp, line.mate)}</strong>
                  <span>{lineToSan(current.fenBefore, line.pv).join(' ')}</span>
                </div>
              ))}
            </div>
          )}

          <EvaluationGraph moves={review.moves} selected={safeIndex} onSelect={jump} />

          <div className="prev-next">
            <button disabled={safeIndex === 0} onClick={() => jump(safeIndex - 1)}>← Previous</button>
            <span>{safeIndex + 1} / {review.moves.length}</span>
            <button disabled={safeIndex === review.moves.length - 1} onClick={() => jump(safeIndex + 1)}>Next →</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
