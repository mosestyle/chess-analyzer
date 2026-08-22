import type { Settings } from '../types';

export function HomePage({ settings, goAnalyze, goPlay, goSettings, goAbout }: {
  settings: Settings;
  goAnalyze: () => void;
  goPlay: () => void;
  goSettings: () => void;
  goAbout: () => void;
}) {
  return (
    <main className="home-page page">
      <section className="hero">
        <div className="brand-mark">♞</div>
        <p className="eyebrow">LOCAL-FIRST • STOCKFISH 18</p>
        <h1>Chess Analyzer</h1>
        <p className="hero-copy">Review your games, understand mistakes, retry critical positions, or play a fast local game against Stockfish.</p>
        <div className="hero-actions">
          <button className="primary big" onClick={goAnalyze}>Analyze a game</button>
          <button className="secondary big" onClick={goPlay}>Play computer</button>
        </div>
        <div className="privacy-pill">🔒 Games stay on this device</div>
      </section>

      <section className="home-grid">
        <article className="feature-card">
          <span className="feature-icon">⚙</span>
          <h2>Stockfish 18</h2>
          <p>{settings.engineMode === 'full' ? 'Full NNUE is selected.' : 'Lite is selected.'} Switch any time.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">!!</span>
          <h2>Game Review</h2>
          <p>Brilliant, Great, Best, inaccuracies, mistakes, misses, blunders, critical moments and accuracy.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">12</span>
          <h2>Play Stockfish</h2>
          <p>Twelve difficulty levels with Practice Mode, hints, takebacks and instant post-game analysis.</p>
        </article>
      </section>

      <nav className="home-links">
        <button onClick={goSettings}>Settings</button>
        <button onClick={goAbout}>About & licenses</button>
      </nav>
    </main>
  );
}
