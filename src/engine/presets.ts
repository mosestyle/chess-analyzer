import type { AnalysisQuality } from '../types';

export interface AnalysisPreset {
  label: string;
  /** Deeper settings for one pasted FEN / interactive analysis. */
  positionDepth: number;
  positionMultiPV: number;
  /**
   * Analyzer Engine V2 full-game budget. Fixed nodes make the measurement layer
   * reproducible across devices: faster CPUs finish sooner but do not get a
   * different classification simply because they reached a higher depth.
   */
  reviewNodes: number;
  /** One principal variation is the frozen V2 classification input. */
  reviewMultiPV: 1;
  /** Tiny cooperative pause between positions to avoid sustained thermal spikes. */
  reviewPauseMs: number;
}

export const ANALYSIS_PRESETS: Record<AnalysisQuality, AnalysisPreset> = {
  quick: {
    label: 'Quick',
    positionDepth: 10,
    positionMultiPV: 2,
    reviewNodes: 18_000,
    reviewMultiPV: 1,
    reviewPauseMs: 12,
  },
  standard: {
    label: 'Standard',
    positionDepth: 14,
    positionMultiPV: 3,
    // Chosen to stay close to V0.2.0 thermals while being steadier than a raw
    // depth-12 cutoff. No second verification pass exists in V0.3 Standard.
    reviewNodes: 48_000,
    reviewMultiPV: 1,
    reviewPauseMs: 24,
  },
  deep: {
    label: 'Deep',
    positionDepth: 18,
    positionMultiPV: 3,
    reviewNodes: 140_000,
    reviewMultiPV: 1,
    reviewPauseMs: 18,
  },
  maximum: {
    label: 'Maximum',
    positionDepth: 22,
    positionMultiPV: 3,
    reviewNodes: 360_000,
    reviewMultiPV: 1,
    reviewPauseMs: 12,
  },
};
