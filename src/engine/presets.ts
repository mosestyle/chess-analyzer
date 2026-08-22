import type { AnalysisQuality } from '../types';

export const ANALYSIS_PRESETS: Record<AnalysisQuality, { depth: number; multiPV: number; label: string }> = {
  quick: { depth: 12, multiPV: 2, label: 'Quick' },
  standard: { depth: 16, multiPV: 3, label: 'Standard' },
  deep: { depth: 20, multiPV: 3, label: 'Deep' },
  maximum: { depth: 24, multiPV: 3, label: 'Maximum' },
};
