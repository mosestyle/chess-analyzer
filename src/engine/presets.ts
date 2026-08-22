import type { AnalysisQuality } from '../types';

export interface AnalysisPreset {
  label: string;
  /** Deeper settings for a single pasted FEN. */
  positionDepth: number;
  positionMultiPV: number;
  /** Fast first pass for a full-game review. */
  reviewDepth: number;
  reviewMultiPV: number;
  /** Optional short second-pass search budget for genuinely special positions. */
  reviewVerifyMovetimeMs: number;
  /** Hard cap on extra verification positions. */
  reviewVerifyLimit: number;
  /** Small idle gap between bounded verification searches. */
  reviewVerifyPauseMs: number;
  /** Deep/Maximum may spend extra work around ordinary error boundaries. */
  reviewVerifyErrors: boolean;
}

export const ANALYSIS_PRESETS: Record<AnalysisQuality, AnalysisPreset> = {
  quick: {
    label: 'Quick',
    positionDepth: 10,
    positionMultiPV: 2,
    reviewDepth: 9,
    reviewMultiPV: 2,
    reviewVerifyMovetimeMs: 0,
    reviewVerifyLimit: 0,
    reviewVerifyPauseMs: 0,
    reviewVerifyErrors: false,
  },
  standard: {
    label: 'Standard',
    positionDepth: 14,
    positionMultiPV: 3,
    reviewDepth: 12,
    reviewMultiPV: 2,
    // Standard should feel close to the fast/cool V0.2.0 path. A maximum of two
    // short time-bounded checks replaces the former ten depth-15 searches.
    reviewVerifyMovetimeMs: 180,
    reviewVerifyLimit: 2,
    reviewVerifyPauseMs: 60,
    reviewVerifyErrors: false,
  },
  deep: {
    label: 'Deep',
    positionDepth: 18,
    positionMultiPV: 3,
    reviewDepth: 15,
    reviewMultiPV: 2,
    reviewVerifyMovetimeMs: 450,
    reviewVerifyLimit: 6,
    reviewVerifyPauseMs: 80,
    reviewVerifyErrors: true,
  },
  maximum: {
    label: 'Maximum',
    positionDepth: 22,
    positionMultiPV: 3,
    reviewDepth: 19,
    reviewMultiPV: 3,
    reviewVerifyMovetimeMs: 900,
    reviewVerifyLimit: 10,
    reviewVerifyPauseMs: 50,
    reviewVerifyErrors: true,
  },
};
