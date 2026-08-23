import type { Classification, GameReview, ReviewMove } from '../types';
import { ANALYZER_MODEL_VERSION, CALIBRATION_MODEL } from './calibration';
import { DATA_CALIBRATED_MODEL_VERSION } from './dataCalibratedClassifier';

export const CHESSCOM_NAG_LABELS: Record<number, Classification> = {
  1: 'Great',
  2: 'Mistake',
  4: 'Blunder',
  6: 'Inaccuracy',
  9: 'Miss',
};

export interface NagReference {
  ply: number;
  san: string;
  nag: number;
  label: Classification;
}

function stripHeaders(pgn: string) {
  return pgn.split(/\r?\n/).filter((line) => !line.trim().startsWith('[')).join(' ');
}

function stripNestedVariations(text: string) {
  let out = '';
  let depth = 0;
  for (const char of text) {
    if (char === '(') { depth += 1; continue; }
    if (char === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) out += char;
  }
  return out;
}

function tokenizedMovetext(pgn: string) {
  let text = stripHeaders(pgn)
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;[^\n\r]*/g, ' ');
  text = stripNestedVariations(text);
  return text.split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

/**
 * Development-only extraction of Chess.com NAG reference labels.
 * This function is never called by analyzePgn() and never affects runtime labels.
 */
export function extractChessComNagLabels(pgn: string): NagReference[] {
  const references: NagReference[] = [];
  let ply = 0;
  let lastSan = '';

  for (const raw of tokenizedMovetext(pgn)) {
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue;
    if (/^\d+\.(\.\.)?$/.test(raw) || /^\d+\.\.\.$/.test(raw)) continue;

    const nag = raw.match(/^\$(\d+)$/);
    if (nag) {
      const value = Number(nag[1]);
      const label = CHESSCOM_NAG_LABELS[value];
      if (label && ply > 0) references.push({ ply, san: lastSan, nag: value, label });
      continue;
    }

    // Ignore standalone annotation glyphs/comments if present.
    if (/^[!?]+$/.test(raw)) continue;

    const moveNumberPrefix = raw.match(/^\d+\.(?:\.\.)?(.*)$/);
    const token = moveNumberPrefix ? moveNumberPrefix[1] : raw;
    if (!token || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;
    if (token.startsWith('$')) continue;

    ply += 1;
    lastSan = token.replace(/\$\d+$/, '');

    const attached = token.match(/\$(\d+)$/);
    if (attached) {
      const value = Number(attached[1]);
      const label = CHESSCOM_NAG_LABELS[value];
      if (label) references.push({ ply, san: lastSan, nag: value, label });
    }
  }

  return references;
}

export function normalizedMoveTokens(pgn: string) {
  const tokens: string[] = [];
  for (const raw of tokenizedMovetext(pgn)) {
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue;
    if (/^\$\d+$/.test(raw)) continue;
    if (/^\d+\.(\.\.)?$/.test(raw) || /^\d+\.\.\.$/.test(raw)) continue;
    const withoutPrefix = raw.replace(/^\d+\.(?:\.\.)?/, '');
    if (!withoutPrefix || /^[!?]+$/.test(withoutPrefix)) continue;
    tokens.push(withoutPrefix.replace(/\$\d+$/, ''));
  }
  return tokens;
}

export function pgnFingerprint(pgn: string) {
  const text = normalizedMoveTokens(pgn).join(' ');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, '0')}-${normalizedMoveTokens(pgn).length}`;
}

function rawMove(move: ReviewMove, reference?: NagReference) {
  return {
    ply: move.ply,
    moveNumber: move.moveNumber,
    color: move.color,
    san: move.san,
    uci: move.uci,
    fenBefore: move.fenBefore,
    fenAfter: move.fenAfter,
    evalBefore: move.evalBefore,
    evalAfter: move.evalAfter,
    cpLoss: move.cpLoss ?? null,
    winPctLoss: move.winPctLoss ?? null,
    winPctBefore: move.winPctBefore ?? null,
    winPctAfter: move.winPctAfter ?? null,
    rating: move.ratingUsed ?? null,
    legalCount: move.legalCount ?? null,
    isEngineTop: Boolean(move.isEngineTop),
    isBook: Boolean(move.isBook),
    isSacrifice: Boolean(move.isSacrifice),
    beforeMate: move.beforeMate ?? null,
    afterMate: move.afterMate ?? null,
    bestMove: move.bestMove,
    predictedLabel: move.classification,
    ordinaryLabel: move.standardClassification ?? null,
    referenceNag: reference?.nag ?? null,
    referenceLabel: reference?.label ?? null,
  };
}

export function buildCalibrationExport(review: GameReview) {
  const refs = new Map(extractChessComNagLabels(review.pgn).map((ref) => [ref.ply, ref]));
  return {
    schemaVersion: 1,
    analyzerVersion: '0.3.2',
    analyzerModelVersion: ANALYZER_MODEL_VERSION,
    classificationModelVersion: DATA_CALIBRATED_MODEL_VERSION,
    calibrationModel: CALIBRATION_MODEL,
    fingerprint: pgnFingerprint(review.pgn),
    exportedAt: new Date().toISOString(),
    engine: {
      mode: review.engineMode,
      quality: review.analysisQuality,
      profile: CALIBRATION_MODEL.engineProfile,
    },
    game: {
      whiteName: review.whiteName,
      blackName: review.blackName,
      whiteElo: review.whiteElo ?? null,
      blackElo: review.blackElo ?? null,
      eco: review.eco ?? null,
      opening: review.opening,
      whiteAccuracy: review.whiteAccuracy,
      blackAccuracy: review.blackAccuracy,
      counts: review.counts,
    },
    moves: review.moves.map((move) => rawMove(move, refs.get(move.ply))),
    developmentOnlyReferenceLabels: [...refs.values()],
    sourcePgn: review.pgn,
  };
}

export function calibrationModeEnabled() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('calibration') === '1';
}

export function downloadCalibrationExport(review: GameReview) {
  const payload = buildCalibrationExport(review);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `calibration-${payload.fingerprint}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
