import type { AnalysisQuality } from '../types';

export interface AnalysisPreset {
  label: string;
  /** Deeper settings for a single pasted FEN. */
  positionDepth: number;
  positionMultiPV: number;
  /** Fast first pass for a full-game review. */
  reviewDepth: number;
  reviewMultiPV: number;
  /** Selective second-pass depth for ambiguous/critical moves. */
  reviewVerifyDepth: number;
  /** Hard cap on deeper verification positions so Standard stays thermally reasonable. */
  reviewVerifyLimit: number;
  /** Small idle gap between deeper searches to avoid sustained CPU saturation. */
  reviewVerifyPauseMs: number;
}

export const ANALYSIS_PRESETS: Record<AnalysisQuality, AnalysisPreset> = {
  quick: {
    label: 'Quick',
    positionDepth: 10,
    positionMultiPV: 2,
    reviewDepth: 9,
    reviewMultiPV: 2,
    reviewVerifyDepth: 11,
    reviewVerifyLimit: 4,
    reviewVerifyPauseMs: 100,
  },
  standard: {
    label: 'Standard',
    positionDepth: 14,
    positionMultiPV: 3,
    reviewDepth: 12,
    reviewMultiPV: 2,
    reviewVerifyDepth: 15,
    reviewVerifyLimit: 10,
    reviewVerifyPauseMs: 160,
  },
  deep: {
    label: 'Deep',
    positionDepth: 18,
    positionMultiPV: 3,
    reviewDepth: 15,
    reviewMultiPV: 2,
    reviewVerifyDepth: 18,
    reviewVerifyLimit: 14,
    reviewVerifyPauseMs: 90,
  },
  maximum: {
    label: 'Maximum',
    positionDepth: 22,
    positionMultiPV: 3,
    reviewDepth: 19,
    reviewMultiPV: 3,
    reviewVerifyDepth: 21,
    reviewVerifyLimit: 20,
    reviewVerifyPauseMs: 40,
  },
};
