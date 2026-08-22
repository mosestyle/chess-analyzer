export type EngineMode = 'full' | 'lite';
export type AnalysisQuality = 'quick' | 'standard' | 'deep' | 'maximum';
export type SideChoice = 'white' | 'black' | 'random';
export type Classification =
  | 'Brilliant'
  | 'Great'
  | 'Best'
  | 'Excellent'
  | 'Good'
  | 'Book'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Miss'
  | 'Blunder';

export type SpecialTag =
  | 'Critical Moment'
  | 'Only Move'
  | 'Forced Move'
  | 'Missed Win'
  | 'Missed Mate'
  | 'Missed Tactic'
  | 'Winning Sacrifice'
  | 'Hanging Piece'
  | 'Major Turning Point';

export interface EngineLine {
  multipv: number;
  depth: number;
  scoreCp: number;
  mate?: number;
  pv: string[];
}

export interface EngineAnalysis {
  fen: string;
  depth: number;
  bestMove: string;
  ponder?: string;
  lines: EngineLine[];
  scoreCp: number;
  mate?: number;
}

export interface ReviewMove {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;
  evalAfter: number;
  expectedLoss: number;
  bestMove: string;
  bestLine: string[];
  alternatives: EngineLine[];
  classification: Classification;
  tags: SpecialTag[];
  explanation: string;
}

export interface GameReview {
  pgn: string;
  startFen: string;
  whiteName: string;
  blackName: string;
  whiteElo?: number;
  blackElo?: number;
  eco?: string;
  opening: string;
  engineMode: EngineMode;
  analysisQuality: AnalysisQuality;
  moves: ReviewMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  counts: Record<'white' | 'black', Record<Classification, number>>;
}

export interface Settings {
  engineMode: EngineMode;
  analysisQuality: AnalysisQuality;
  autoFallbackLite: boolean;
  animations: boolean;
  animationSpeed: 'fast' | 'normal' | 'relaxed';
  sound: boolean;
  moveSounds: boolean;
  reviewSounds: boolean;
  volume: number;
  theme: 'system' | 'light' | 'dark';
  boardTheme: 'brown' | 'green' | 'blue';
  showCoordinates: boolean;
  showLegalMoves: boolean;
  showLastMove: boolean;
  showBestArrows: boolean;
  showEvaluation: boolean;
  showEngineLines: boolean;
  showReviewGraph: boolean;
  showCriticalMoments: boolean;
  defaultDifficulty: number;
  defaultSide: SideChoice;
  defaultPractice: boolean;
  defaultCasual: boolean;
}
