import { AppHeader } from '../components/AppHeader';

export function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="page about-page">
      <AppHeader title="About" onBack={onBack} />
      <section className="panel prose">
        <div className="brand-mark small">♞</div>
        <h2>Chess Analyzer V0.3</h2>
        <p>A local-first chess analyzer and play-vs-computer application. Core chess analysis runs in your browser.</p>
        <h3>Engine</h3>
        <p>Stockfish 18 via Stockfish.js. The app supports Full NNUE and Lite single-threaded WebAssembly builds. Full NNUE is the default.</p>
        <h3>Privacy</h3>
        <p>V0.3 does not require an account or backend. Your pasted games and local games are processed on your device.</p>
        <h3>Licensing</h3>
        <p>Stockfish and Stockfish.js are GPLv3 software. See <code>LICENSES/Stockfish-GPL-3.0.txt</code> and <code>THIRD_PARTY_NOTICES.md</code> in the repository. The application code is released under MIT.</p>
        <h3>Analyzer Engine V2</h3>
        <p>V0.3 uses one reproducible Stockfish measurement pass and a separate calibrated classification layer. It follows Chess.com's published Expected Points category bands and uses independent relational rules for Brilliant, Great and Miss. It is not Chess.com's private Game Review implementation.</p>
      </section>
    </main>
  );
}
