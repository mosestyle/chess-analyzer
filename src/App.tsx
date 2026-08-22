import { useEffect, useState } from 'react';
import { HomePage } from './pages/HomePage';
import { AnalyzePage } from './pages/AnalyzePage';
import { ReviewPage } from './pages/ReviewPage';
import { PlayPage } from './pages/PlayPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { loadSettings, saveSettings } from './settings';
import type { GameReview, Settings } from './types';

type Screen = 'home' | 'analyze' | 'review' | 'play' | 'settings' | 'about';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [review, setReview] = useState<GameReview | null>(null);
  const [settingsReturn, setSettingsReturn] = useState<Screen>('home');

  const setSettings = (next: Settings) => {
    setSettingsState(next);
    saveSettings(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, [settings.theme]);

  function openSettings(returnTo: Screen = screen) {
    setSettingsReturn(returnTo === 'settings' ? 'home' : returnTo);
    setScreen('settings');
  }

  function receiveReview(next: GameReview) {
    setReview(next);
    setScreen('review');
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <HomePage
          settings={settings}
          goAnalyze={() => setScreen('analyze')}
          goPlay={() => setScreen('play')}
          goSettings={() => openSettings('home')}
          goAbout={() => setScreen('about')}
        />
      )}
      {screen === 'analyze' && <AnalyzePage settings={settings} setSettings={setSettings} onBack={() => setScreen('home')} onReview={receiveReview} />}
      {screen === 'review' && review && <ReviewPage review={review} settings={settings} onBack={() => setScreen('home')} onSettings={() => openSettings('review')} />}
      {screen === 'play' && <PlayPage settings={settings} setSettings={setSettings} onBack={() => setScreen('home')} onReview={receiveReview} />}
      {screen === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} onBack={() => setScreen(settingsReturn)} />}
      {screen === 'about' && <AboutPage onBack={() => setScreen('home')} />}
    </div>
  );
}
