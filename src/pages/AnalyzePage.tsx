import { useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { AppHeader } from '../components/AppHeader';
import { ChessBoard } from '../components/ChessBoard';
import { EngineSelector } from '../components/EngineSelector';
import { EvaluationBar, formatEval } from '../components/EvaluationBar';
import { analyzePgn } from '../analysis/analyzeGame';
import { engineManager } from '../engine/EngineManager';
import { ANALYSIS_PRESETS } from '../engine/presets';
import { lineToSan, uciToSan } from '../chess/helpers';
import type { EngineAnalysis, GameReview, Settings } from '../types';

const SAMPLE_PGN = `[Event "Example"]\n[White "White"]\n[Black "Black"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. O-O d6 6. c3 O-O 7. Re1 a6 8. Bb3 Ba7 *`;

export function AnalyzePage({ settings, setSettings, onBack, onReview }: {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  onBack: () => void;
  onReview: (review: GameReview) => void;
}) {
  const [mode, setMode] = useState<'pgn' | 'fen'>('pgn');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 1, stage: '' });
  const [fenResult, setFenResult] = useState<{ fen: string; analysis: EngineAnalysis } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const progressPercent = useMemo(() => Math.round((progress.done / Math.max(1, progress.total)) * 100), [progress]);

  const updateEngine = (engineMode: Settings['engineMode']) => {
    setSettings({ ...settings, engineMode });
    setFenResult(null);
  };

  async function analyze() {
    setError('');
    setFenResult(null);
    if (!input.trim()) {
      setError(`Paste a ${mode.toUpperCase()} first.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'fen') {
        let chess: Chess;
        try { chess = new Chess(input.trim()); } catch { throw new Error('That FEN is not valid.'); }
        const preset = ANALYSIS_PRESETS[settings.analysisQuality];
        let engine;
        try {
          engine = await engineManager.get(settings.engineMode, (percent) => setProgress({ done: Math.round(percent * 100), total: 100, stage: `Loading ${settings.engineMode === 'full' ? 'Full NNUE' : 'Lite'} engine` }));
        } catch (e) {
          if (settings.engineMode === 'full' && settings.autoFallbackLite) engine = await engineManager.switch('lite');
          else throw e;
        }
        const result = await engine.analyze(chess.fen(), { depth: preset.positionDepth, multiPV: preset.positionMultiPV, hash: 24 });
        setFenResult({ fen: chess.fen(), analysis: result });
      } else {
        const abort = new AbortController();
        abortRef.current = abort;
        const review = await analyzePgn(input.trim(), {
          engineMode: settings.engineMode,
          quality: settings.analysisQuality,
          autoFallbackLite: settings.autoFallbackLite,
          signal: abort.signal,
          onProgress: setProgress,
        });
        onReview(review);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Analysis failed.');
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  async function cancel() {
    abortRef.current?.abort();
    engineManager.dispose();
    setBusy(false);
  }

  return (
    <main className="page analyze-page">
      <AppHeader title="Analyze" onBack={onBack} />
      <section className="panel import-panel">
        <div className="tab-row">
          <button className={mode === 'pgn' ? 'active' : ''} onClick={() => setMode('pgn')}>PGN game</button>
          <button className={mode === 'fen' ? 'active' : ''} onClick={() => setMode('fen')}>FEN position</button>
        </div>

        <label className="field-label" htmlFor="analysis-input">{mode === 'pgn' ? 'Paste a complete game' : 'Paste a position'}</label>
        <textarea
          id="analysis-input"
          className="analysis-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'pgn' ? '[Event "..."]\n1. e4 e5 2. Nf3 ...' : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
          spellCheck={false}
        />
        <div className="inline-actions">
          <button className="secondary" onClick={async () => {
            try { setInput(await navigator.clipboard.readText()); } catch { setError('Clipboard access was blocked by the browser.'); }
          }}>Paste</button>
          {mode === 'pgn' && <button className="ghost" onClick={() => setInput(SAMPLE_PGN)}>Use example</button>}
          {mode === 'pgn' && <label className="file-button">Upload .pgn<input type="file" accept=".pgn,text/plain" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) file.text().then(setInput).catch(() => setError('Could not read that file.'));
          }} /></label>}
        </div>

        <div className="settings-block">
          <span className="field-label">Engine</span>
          <EngineSelector value={settings.engineMode} onChange={updateEngine} />
        </div>

        <div className="settings-block">
          <label className="field-label">Analysis quality</label>
          <select value={settings.analysisQuality} onChange={(e) => setSettings({ ...settings, analysisQuality: e.target.value as Settings['analysisQuality'] })}>
            <option value="quick">Quick</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep</option>
            <option value="maximum">Maximum</option>
          </select>
        </div>

        {error && <div className="error-box">{error}</div>}

        {busy ? (
          <div className="analysis-progress">
            <div className="progress-head"><strong>{progress.stage || 'Starting Stockfish…'}</strong><span>{mode === 'pgn' ? `${progressPercent}%` : ''}</span></div>
            <div className="progress-track"><div style={{ width: mode === 'pgn' ? `${progressPercent}%` : '35%' }} /></div>
            <p>{settings.engineMode === 'full' ? 'Stockfish 18 Full NNUE' : 'Stockfish 18 Lite'} • {ANALYSIS_PRESETS[settings.analysisQuality].label}</p>
            <button className="danger-outline" onClick={() => void cancel()}>Cancel</button>
          </div>
        ) : <button className="primary full-width" onClick={() => void analyze()}>{mode === 'pgn' ? 'Analyze game' : 'Analyze position'}</button>}
      </section>

      {fenResult && (
        <section className="fen-result panel">
          <div className="fen-layout">
            <div className="board-with-eval">
              {settings.showEvaluation && <EvaluationBar cp={fenResult.analysis.scoreCp} mate={fenResult.analysis.mate} />}
              <ChessBoard
                fen={fenResult.fen}
                settings={settings}
                arrow={fenResult.analysis.bestMove !== '(none)' ? { from: fenResult.analysis.bestMove.slice(0, 2), to: fenResult.analysis.bestMove.slice(2, 4) } : null}
              />
            </div>
            <div className="result-copy">
              <p className="eyebrow">POSITION ANALYSIS</p>
              <h2>{formatEval(fenResult.analysis.scoreCp, fenResult.analysis.mate)}</h2>
              <p><strong>Best move:</strong> {uciToSan(fenResult.fen, fenResult.analysis.bestMove)}</p>
              <p><strong>Depth:</strong> {fenResult.analysis.depth}</p>
              {settings.showEngineLines && fenResult.analysis.lines.map((line) => (
                <div className="engine-line" key={line.multipv}>
                  <strong>{line.multipv}. {formatEval(line.scoreCp, line.mate)}</strong>
                  <span>{lineToSan(fenResult.fen, line.pv).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
