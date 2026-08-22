export interface DifficultyPreset {
  level: number;
  label: string;
  skill: number;
  movetime: number;
}

const LABELS = [
  'Complete beginner', 'Beginner', 'Casual', 'Improving beginner', 'Intermediate', 'Lower club',
  'Club player', 'Strong club', 'Advanced', 'Expert', 'Very strong', 'Maximum challenge',
];

export function difficultyPreset(level: number): DifficultyPreset {
  const safe = Math.max(1, Math.min(12, Math.round(level)));
  // V1 calibration. These are deliberately easy to tune after real-game testing.
  const skills = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 20];
  const times = [120, 150, 180, 220, 280, 350, 450, 600, 800, 1000, 1400, 2000];
  return { level: safe, label: LABELS[safe - 1], skill: skills[safe - 1], movetime: times[safe - 1] };
}
