import { AppHeader } from '../components/AppHeader';
import { EngineSelector } from '../components/EngineSelector';
import type { Settings } from '../types';

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-row">
      <div><strong>{label}</strong>{sub && <span>{sub}</span>}</div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function SettingsPage({ settings, setSettings, onBack }: {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  onBack: () => void;
}) {
  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings({ ...settings, [key]: value });
  return (
    <main className="page settings-page">
      <AppHeader title="Settings" onBack={onBack} />

      <section className="panel settings-section">
        <h2>Engine</h2>
        <EngineSelector value={settings.engineMode} onChange={(v) => patch('engineMode', v)} />
        <label className="stack-field"><span>Analysis quality</span>
          <select value={settings.analysisQuality} onChange={(e) => patch('analysisQuality', e.target.value as Settings['analysisQuality'])}>
            <option value="quick">Quick</option><option value="standard">Standard</option><option value="deep">Deep</option><option value="maximum">Maximum</option>
          </select>
        </label>
        <Toggle label="Automatically fall back to Lite" sub="Only if Full cannot start" checked={settings.autoFallbackLite} onChange={(v) => patch('autoFallbackLite', v)} />
      </section>

      <section className="panel settings-section">
        <h2>Board</h2>
        <label className="stack-field"><span>Board theme</span>
          <select value={settings.boardTheme} onChange={(e) => patch('boardTheme', e.target.value as Settings['boardTheme'])}>
            <option value="brown">Classic brown</option><option value="green">Green</option><option value="blue">Blue</option>
          </select>
        </label>
        <Toggle label="Coordinates" checked={settings.showCoordinates} onChange={(v) => patch('showCoordinates', v)} />
        <Toggle label="Legal move indicators" checked={settings.showLegalMoves} onChange={(v) => patch('showLegalMoves', v)} />
        <Toggle label="Last move highlight" checked={settings.showLastMove} onChange={(v) => patch('showLastMove', v)} />
        <Toggle label="Best move arrows" checked={settings.showBestArrows} onChange={(v) => patch('showBestArrows', v)} />
        <Toggle label="Evaluation bar" checked={settings.showEvaluation} onChange={(v) => patch('showEvaluation', v)} />
      </section>

      <section className="panel settings-section">
        <h2>Animation</h2>
        <Toggle label="Animations" checked={settings.animations} onChange={(v) => patch('animations', v)} />
        <label className="stack-field"><span>Animation speed</span>
          <select value={settings.animationSpeed} onChange={(e) => patch('animationSpeed', e.target.value as Settings['animationSpeed'])}>
            <option value="fast">Fast</option><option value="normal">Normal</option><option value="relaxed">Relaxed</option>
          </select>
        </label>
      </section>

      <section className="panel settings-section">
        <h2>Sound</h2>
        <Toggle label="Sound effects" checked={settings.sound} onChange={(v) => patch('sound', v)} />
        <Toggle label="Move sounds" checked={settings.moveSounds} onChange={(v) => patch('moveSounds', v)} />
        <Toggle label="Review sounds" checked={settings.reviewSounds} onChange={(v) => patch('reviewSounds', v)} />
        <label className="stack-field"><span>Volume: {Math.round(settings.volume * 100)}%</span><input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(e) => patch('volume', Number(e.target.value))} /></label>
      </section>

      <section className="panel settings-section">
        <h2>Review</h2>
        <Toggle label="Show engine lines" checked={settings.showEngineLines} onChange={(v) => patch('showEngineLines', v)} />
        <Toggle label="Evaluation graph during review" sub="Show the graph below Show best / Retry" checked={settings.showReviewGraph} onChange={(v) => patch('showReviewGraph', v)} />
        <Toggle label="Show critical moments" checked={settings.showCriticalMoments} onChange={(v) => patch('showCriticalMoments', v)} />
      </section>

      <section className="panel settings-section">
        <h2>Play computer</h2>
        <label className="stack-field"><span>Default difficulty: {settings.defaultDifficulty}</span><input type="range" min="1" max="12" value={settings.defaultDifficulty} onChange={(e) => patch('defaultDifficulty', Number(e.target.value))} /></label>
        <label className="stack-field"><span>Default side</span><select value={settings.defaultSide} onChange={(e) => patch('defaultSide', e.target.value as Settings['defaultSide'])}><option value="random">Random</option><option value="white">White</option><option value="black">Black</option></select></label>
        <Toggle label="Practice mode by default" checked={settings.defaultPractice} onChange={(v) => patch('defaultPractice', v)} />
        <Toggle label="Casual mode by default" checked={settings.defaultCasual} onChange={(v) => patch('defaultCasual', v)} />
      </section>

      <section className="panel settings-section">
        <h2>Appearance</h2>
        <label className="stack-field"><span>Theme</span><select value={settings.theme} onChange={(e) => patch('theme', e.target.value as Settings['theme'])}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
      </section>
    </main>
  );
}
