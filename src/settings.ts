import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  engineMode: 'full',
  analysisQuality: 'standard',
  autoFallbackLite: false,
  animations: true,
  animationSpeed: 'normal',
  sound: true,
  moveSounds: true,
  reviewSounds: true,
  volume: 0.7,
  theme: 'system',
  boardTheme: 'brown',
  showCoordinates: true,
  showLegalMoves: true,
  showLastMove: true,
  showBestArrows: true,
  showEvaluation: true,
  showEngineLines: true,
  showReviewGraph: true,
  showCriticalMoments: true,
  defaultDifficulty: 5,
  defaultSide: 'random',
  defaultPractice: false,
  defaultCasual: true,
};

const KEY = 'chess-analyzer-settings-v1';

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
