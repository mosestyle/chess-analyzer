type ChessSound = 'move' | 'capture' | 'check' | 'castle' | 'promotion' | 'gameEnd' | 'reviewGood' | 'reviewBad';

let ctx: AudioContext | null = null;

function audioContext() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playChessSound(type: ChessSound, enabled: boolean, volume = 0.7) {
  if (!enabled || typeof AudioContext === 'undefined') return;
  try {
    const ac = audioContext();
    const now = ac.currentTime;
    const gain = ac.createGain();
    const osc = ac.createOscillator();
    const settings: Record<ChessSound, [number, number, OscillatorType]> = {
      move: [340, 0.055, 'triangle'],
      capture: [190, 0.085, 'square'],
      check: [520, 0.09, 'sine'],
      castle: [280, 0.12, 'triangle'],
      promotion: [660, 0.14, 'sine'],
      gameEnd: [220, 0.22, 'triangle'],
      reviewGood: [620, 0.08, 'sine'],
      reviewBad: [150, 0.1, 'sawtooth'],
    };
    const [frequency, duration, wave] = settings[type];
    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)) * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Sound is optional; autoplay/browser restrictions must never break chess.
  }
}
