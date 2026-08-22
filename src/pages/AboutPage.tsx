import { AppHeader } from '../components/AppHeader';

export function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="page about-page">
      <AppHeader title="About" onBack={onBack} />
      <section className="panel prose">
        <div className="brand-mark small">♞</div>
        <h2>Chess Analyzer V1</h2>
        <p>A local-first chess analyzer and play-vs-computer application. Core chess analysis runs in your browser.</p>
        <h3>Engine</h3>
        <p>Stockfish 18 via Stockfish.js. The app supports Full NNUE and Lite single-threaded WebAssembly builds. Full NNUE is the default.</p>
        <h3>Privacy</h3>
        <p>V1 does not require an account or backend. Your pasted games and local games are processed on your device.</p>
        <h3>Licensing</h3>
        <p>Stockfish and Stockfish.js are GPLv3 software. See <code>LICENSES/Stockfish-GPL-3.0.txt</code> and <code>THIRD_PARTY_NOTICES.md</code> in the repository. The application code is released under MIT.</p>
        <h3>Important V1 note</h3>
        <p>Move labels, accuracy and explanations use this project's own heuristics. They are not Chess.com's classification or accuracy algorithms and should be calibrated further using a larger test corpus.</p>
      </section>
    </main>
  );
}
