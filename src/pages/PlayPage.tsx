import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { AppHeader } from '../components/AppHeader';
import { ChessBoard, type BoardMove } from '../components/ChessBoard';
import { ClassificationBadge } from '../components/ClassificationBadge';
import { EngineSelector } from '../components/EngineSelector';
import { engineManager } from '../engine/EngineManager';
import { difficultyPreset } from '../play/difficulty';
import { classifyMove, expectedLoss, specialTags } from '../analysis/classification';
import { explainMove } from '../analysis/explanations';
import { moveToUci, START_FEN, uciToSan } from '../chess/helpers';
import { playChessSound } from '../services/sound';
import type { Classification, GameReview, Settings, SideChoice } from '../types';
import { analyzePgn } from '../analysis/analyzeGame';

function rebuild(sans: string[]) {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  return chess;
}

function resultText(chess: Chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  if (chess.isStalemate()) return 'Draw by stalemate';
  if (chess.isThreefoldRepetition()) return 'Draw by repetition';
  if (chess.isInsufficientMaterial()) return 'Draw by insufficient material';
  if (chess.isDraw()) return 'Draw';
  return '';
}

export function PlayPage({ settings, setSettings, onBack, onReview }: {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  onBack: () => void;
  onReview: (review: GameReview) => void;
}) {
  const [screen, setScreen] = useState<'setup' | 'game'>('setup');
  const [level, setLevel] = useState(settings.defaultDifficulty);
  const [side, setSide] = useState<SideChoice>(settings.defaultSide);
  const [practice, setPractice] = useState(settings.defaultPractice);
  const [casual, setCasual] = useState(settings.defaultCasual);
  const [userColor, setUserColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(START_FEN);
  const [sans, setSans] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hint, setHint] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [feedback, setFeedback] = useState<{ classification: Classification; text: string } | null>(null);
  const [gameResult, setGameResult] = useState('');
  const [error, setError] = useState('');
  const preset = useMemo(() => difficultyPreset(level), [level]);

  const playSoundForMove = (move: ReturnType<Chess['move']>, after: Chess) => {
    if (!move) return;
    let sound: Parameters<typeof playChessSound>[0] = 'move';
    if (move.promotion) sound = 'promotion';
    else if (move.flags.includes('k') || move.flags.includes('q')) sound = 'castle';
    else if (after.inCheck()) sound = 'check';
    else if (move.captured) sound = 'capture';
    playChessSound(sound, settings.sound && settings.moveSounds, settings.volume);
  };

  async function computerMove(currentFen: string, currentSans: string[], currentLevel = level) {
    const position = new Chess(currentFen);
    if (position.isGameOver()) {
      setGameResult(resultText(position));
      return;
    }
    setThinking(true);
    setHint(null);
    const started = performance.now();
    try {
      const engine = await engineManager.get(settings.engineMode);
      const difficulty = difficultyPreset(currentLevel);
      const analysis = await engine.analyze(currentFen, {
        movetime: difficulty.movetime,
        multiPV: 1,
        skillLevel: difficulty.skill,
        hash: 16,
      });
      if (!analysis.bestMove || analysis.bestMove === '(none)') return;
      const elapsed = performance.now() - started;
      const naturalMinimum = 450 + currentLevel * 20;
      if (elapsed < naturalMinimum) await new Promise((r) => setTimeout(r, naturalMinimum - elapsed));

      const game = new Chess(currentFen);
      const moved = game.move({
        from: analysis.bestMove.slice(0, 2),
        to: analysis.bestMove.slice(2, 4),
        promotion: analysis.bestMove[4],
      });
      if (!moved) throw new Error('Stockfish returned an illegal move.');
      const nextSans = [...currentSans, moved.san];
      setSans(nextSans);
      setFen(game.fen());
      setLastMove({ from: moved.from, to: moved.to });
      playSoundForMove(moved, game);
      if (game.isGameOver()) {
        setGameResult(resultText(game));
        playChessSound('gameEnd', settings.sound && settings.moveSounds, settings.volume);
      }
    } catch (e) {
      setError((e as Error).message || 'Computer move failed.');
    } finally {
      setThinking(false);
    }
  }

  async function practiceFeedback(beforeFen: string, afterFen: string, moved: NonNullable<ReturnType<Chess['move']>>) {
    try {
      const engine = await engineManager.get(settings.engineMode);
      const before = await engine.analyze(beforeFen, { movetime: 220, multiPV: 2, skillLevel: 20, hash: 16 });
      const after = new Chess(afterFen).isGameOver()
        ? { scoreCp: new Chess(afterFen).isCheckmate() ? (new Chess(afterFen).turn() === 'w' ? -100000 : 100000) : 0 }
        : await engine.analyze(afterFen, { movetime: 180, multiPV: 1, skillLevel: 20, hash: 16 });
      const color = moved.color as 'w' | 'b';
      const loss = expectedLoss(before.scoreCp, after.scoreCp, color);
      const classification = classifyMove({
        loss,
        actualUci: moveToUci(moved),
        bestUci: before.bestMove,
        lines: before.lines,
        color,
        isBook: false,
        fenBefore: beforeFen,
        fenAfter: afterFen,
        piece: moved.piece,
        captured: moved.captured,
      });
      const tags = specialTags({ loss, beforeCp: before.scoreCp, afterCp: after.scoreCp, color, lines: before.lines, bestUci: before.bestMove, actualUci: moveToUci(moved), classification });
      setFeedback({
        classification,
        text: explainMove({ classification, tags, san: moved.san, bestMove: before.bestMove, fenBefore: beforeFen, beforeCp: before.scoreCp, afterCp: after.scoreCp }),
      });
    } catch {
      setFeedback(null);
    }
  }

  async function humanMove(move: BoardMove) {
    if (thinking || gameResult) return false;
    const game = new Chess(fen);
    if (game.turn() !== userColor) return false;
    const beforeFen = game.fen();
    let moved;
    try {
      moved = game.move(move);
    } catch {
      return false;
    }
    if (!moved) return false;
    const nextSans = [...sans, moved.san];
    const nextFen = game.fen();
    setSans(nextSans);
    setFen(nextFen);
    setLastMove({ from: moved.from, to: moved.to });
    setHint(null);
    playSoundForMove(moved, game);

    if (practice) await practiceFeedback(beforeFen, nextFen, moved);
    else setFeedback(null);

    if (game.isGameOver()) {
      setGameResult(resultText(game));
      playChessSound('gameEnd', settings.sound && settings.moveSounds, settings.volume);
      return true;
    }
    await computerMove(nextFen, nextSans);
    return true;
  }

  async function startGame() {
    const chosen: 'w' | 'b' = side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side === 'white' ? 'w' : 'b';
    setUserColor(chosen);
    setFen(START_FEN);
    setSans([]);
    setLastMove(null);
    setHint(null);
    setFeedback(null);
    setGameResult('');
    setError('');
    setScreen('game');
    if (chosen === 'b') window.setTimeout(() => void computerMove(START_FEN, [], level), 250);
  }

  async function showHint() {
    if (!casual || thinking || gameResult) return;
    setThinking(true);
    try {
      const engine = await engineManager.get(settings.engineMode);
      const result = await engine.analyze(fen, { movetime: 250, multiPV: 1, skillLevel: 20, hash: 16 });
      if (result.bestMove !== '(none)') setHint({ from: result.bestMove.slice(0, 2), to: result.bestMove.slice(2, 4) });
    } finally {
      setThinking(false);
    }
  }

  function takeback() {
    if (!casual || thinking || sans.length === 0) return;
    const remove = sans.length >= 2 ? 2 : 1;
    const nextSans = sans.slice(0, -remove);
    const game = rebuild(nextSans);
    setSans(nextSans);
    setFen(game.fen());
    setLastMove(null);
    setHint(null);
    setFeedback(null);
    setGameResult('');
  }

  async function analyzeThisGame() {
    const game = rebuild(sans);
    const pgn = game.pgn();
    setThinking(true);
    setError('');
    try {
      const review = await analyzePgn(pgn, {
        engineMode: settings.engineMode,
        quality: settings.analysisQuality,
        autoFallbackLite: settings.autoFallbackLite,
      });
      onReview(review);
    } catch (e) {
      setError((e as Error).message || 'Could not analyze this game.');
    } finally {
      setThinking(false);
    }
  }

  if (screen === 'setup') {
    return (
      <main className="page play-page">
        <AppHeader title="Play Computer" onBack={onBack} />
        <section className="panel play-setup">
          <div className="level-head"><span>Difficulty</span><strong>Level {level}</strong></div>
          <input className="level-slider" type="range" min="1" max="12" step="1" value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          <div className="level-dots">{Array.from({ length: 12 }, (_, i) => <span key={i} className={i + 1 <= level ? 'filled' : ''} />)}</div>
          <p className="level-label">{preset.label}</p>

          <div className="setup-row">
            <div><strong>Side</strong><span>Choose your color</span></div>
            <select value={side} onChange={(e) => setSide(e.target.value as SideChoice)}>
              <option value="random">Random side</option>
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </div>

          <label className="toggle-row">
            <div><strong>Practice mode</strong><span>Get feedback on your moves</span></div>
            <input type="checkbox" checked={practice} onChange={(e) => setPractice(e.target.checked)} />
          </label>

          <label className="toggle-row">
            <div><strong>Casual</strong><span>Allow takebacks and hints</span></div>
            <input type="checkbox" checked={casual} onChange={(e) => setCasual(e.target.checked)} />
          </label>

          <div className="settings-block">
            <span className="field-label">Engine</span>
            <EngineSelector value={settings.engineMode} onChange={(engineMode) => setSettings({ ...settings, engineMode })} />
          </div>

          <p className="muted">Level {level} normally responds in roughly {level <= 4 ? '0.5–1.5' : level <= 8 ? '0.7–2' : level <= 11 ? '1–2.5' : '1–3'} seconds. Actual speed depends on the device.</p>
          <button className="primary full-width" onClick={() => void startGame()}>Play</button>
        </section>
      </main>
    );
  }

  const orientation = userColor === 'w' ? 'white' : 'black';
  const game = new Chess(fen);

  return (
    <main className="page play-page active-game">
      <AppHeader title="Play Computer" onBack={() => setScreen('setup')} right={<span className="engine-pill">Level {level}</span>} />
      <div className="play-layout">
        <section className="play-board-column">
          <div className="opponent-card"><span className="avatar">♞</span><div><strong>Stockfish 18</strong><span>{settings.engineMode === 'full' ? 'Full NNUE' : 'Lite'} · Level {level}</span></div><b>{thinking ? 'Thinking…' : game.turn() === userColor ? 'Your turn' : 'Ready'}</b></div>
          <ChessBoard
            fen={fen}
            settings={settings}
            orientation={orientation}
            interactive={!thinking && !gameResult && game.turn() === userColor}
            onMove={humanMove}
            lastMove={lastMove}
            arrow={hint}
            disabled={thinking}
          />
          <div className="player-card"><span className="avatar user">♙</span><div><strong>You</strong><span>{userColor === 'w' ? 'White' : 'Black'}</span></div></div>
        </section>

        <aside className="play-side panel">
          <div className="move-history">
            <h3>Moves</h3>
            <div>{sans.length ? sans.map((san, i) => <span key={`${san}-${i}`}>{i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}{san} </span>) : <span className="muted">Game has just started.</span>}</div>
          </div>

          {feedback && practice && (
            <div className="practice-feedback">
              <ClassificationBadge value={feedback.classification} />
              <p>{feedback.text}</p>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          {gameResult ? (
            <div className="game-over-card">
              <p className="eyebrow">GAME OVER</p>
              <h2>{gameResult}</h2>
              <button className="primary full-width" disabled={thinking || sans.length === 0} onClick={() => void analyzeThisGame()}>{thinking ? 'Analyzing…' : 'Analyze this game'}</button>
              <button className="secondary full-width" onClick={() => void startGame()}>Rematch</button>
            </div>
          ) : (
            <div className="play-controls">
              <button disabled={!casual || thinking || sans.length === 0} onClick={takeback}>↶ Takeback</button>
              <button disabled={!casual || thinking} onClick={() => void showHint()}>💡 Hint</button>
              <button className="danger-outline" onClick={() => setGameResult(userColor === 'w' ? 'Black wins — you resigned' : 'White wins — you resigned')}>Resign</button>
            </div>
          )}

          <div className="position-meta">
            <span>Turn</span><strong>{game.turn() === 'w' ? 'White' : 'Black'}</strong>
            {hint && <span className="hint-copy">Hint: {uciToSan(fen, `${hint.from}${hint.to}`)}</span>}
          </div>
        </aside>
      </div>
    </main>
  );
}
