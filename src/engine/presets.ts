import type { AnalysisQuality } from '../types';

export interface AnalysisPreset {
  label: string;
  /** Deeper settings for a single pasted FEN. */
  positionDepth: number;
  positionMultiPV: number;
  /** Faster settings for full-game review, where dozens of positions are analyzed. */
  reviewDepth: number;
  reviewMultiPV: number;
}

export const ANALYSIS_PRESETS: Record<AnalysisQuality, AnalysisPreset> = {
  quick: {
    label: 'Quick',
    positionDepth: 10,
    positionMultiPV: 2,
    reviewDepth: 9,
    reviewMultiPV: 2,
  },
  standard: {
    label: 'Standard',
    positionDepth: 14,
    positionMultiPV: 3,
    reviewDepth: 12,
    reviewMultiPV: 2,
  },
  deep: {
    label: 'Deep',
    positionDepth: 18,
    positionMultiPV: 3,
    reviewDepth: 15,
    reviewMultiPV: 2,
  },
  maximum: {
    label: 'Maximum',
    positionDepth: 22,
    positionMultiPV: 3,
    reviewDepth: 19,
    reviewMultiPV: 3,
  },
};
