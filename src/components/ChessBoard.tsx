import { useEffect, useMemo, useRef, useState, type ImgHTMLAttributes } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { Settings } from '../types';

const FILES = 'abcdefgh';
const PIECE_FILE: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: 'wK.svg', q: 'wQ.svg', r: 'wR.svg', b: 'wB.svg', n: 'wN.svg', p: 'wP.svg' },
  b: { k: 'bK.svg', q: 'bQ.svg', r: 'bR.svg', b: 'bB.svg', n: 'bN.svg', p: 'bP.svg' },
};

export interface BoardMove {
  from: string;
  to: string;
  promotion?: string;
}

interface Props {
  fen: string;
  settings: Settings;
  orientation?: 'white' | 'black';
  interactive?: boolean;
  onMove?: (move: BoardMove) => boolean | void | Promise<boolean | void>;
  lastMove?: { from: string; to: string } | null;
  arrow?: { from: string; to: string } | null;
  disabled?: boolean;
}

function squareToXY(square: string, orientation: 'white' | 'black') {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  if (orientation === 'white') return { x: file, y: 8 - rank };
  return { x: 7 - file, y: rank - 1 };
}

function xyToSquare(x: number, y: number, orientation: 'white' | 'black') {
  const file = orientation === 'white' ? x : 7 - x;
  const rank = orientation === 'white' ? 8 - y : y + 1;
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
  return `${FILES[file]}${rank}` as Square;
}

function animationMs(settings: Settings) {
  if (!settings.animations) return 0;
  if (settings.animationSpeed === 'fast') return 130;
  if (settings.animationSpeed === 'relaxed') return 300;
  return 205;
}

function pieceUrl(color: Color, type: PieceSymbol) {
  const base = new URL(import.meta.env.BASE_URL || './', window.location.href);
  return new URL(`pieces/cburnett/${PIECE_FILE[color][type]}`, base).href;
}

function PieceImage({ color, type, className = '', ...props }: {
  color: Color;
  type: PieceSymbol;
  className?: string;
} & ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      src={pieceUrl(color, type)}
      alt=""
      draggable={false}
      className={`piece ${className}`.trim()}
    />
  );
}

export function ChessBoard({ fen, settings, orientation = 'white', interactive = false, onMove, lastMove, arrow, disabled }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: Color } | null>(null);
  const [ghost, setGhost] = useState<{ from: string; to: string; type: PieceSymbol; color: Color } | null>(null);
  const [ghostEnd, setGhostEnd] = useState(false);

  const legalTargets = useMemo(() => {
    if (!selected || !interactive) return new Set<string>();
    try {
      return new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to));
    } catch {
      return new Set<string>();
    }
  }, [chess, selected, interactive]);

  useEffect(() => {
    setSelected(null);
    if (!lastMove || !settings.animations) {
      setGhost(null);
      return;
    }

    try {
      const after = new Chess(fen);
      const piece = after.get(lastMove.to as Square);
      if (!piece) return;

      setGhost({ from: lastMove.from, to: lastMove.to, type: piece.type, color: piece.color });
      setGhostEnd(false);

      // Two frames guarantee the browser paints the starting square before
      // applying the transform. A single RAF can be batched by React and look
      // like an instant teleport on mobile browsers.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setGhostEnd(true));
      });
      const timer = window.setTimeout(() => setGhost(null), animationMs(settings) + 90);
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
        window.clearTimeout(timer);
      };
    } catch {
      return;
    }
  }, [fen, lastMove?.from, lastMove?.to, settings.animations, settings.animationSpeed]);

  const tryMove = async (from: Square, to: Square, explicitPromotion?: string) => {
    if (!interactive || disabled || !onMove) return false;
    const source = chess.get(from);
    if (!source) return false;
    const candidates = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (!candidates.length) return false;
    const needsPromotion = candidates.some((m) => Boolean(m.promotion));
    if (needsPromotion && !explicitPromotion) {
      setPromotion({ from, to, color: source.color });
      return true;
    }
    const result = await onMove({ from, to, promotion: explicitPromotion || candidates[0].promotion });
    setSelected(null);
    return result !== false;
  };

  const onSquareClick = async (square: Square) => {
    if (!interactive || disabled) return;
    if (selected && legalTargets.has(square)) {
      await tryMove(selected, square);
      return;
    }
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) setSelected(square);
    else setSelected(null);
  };

  const squareFromPointer = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.max(0, Math.min(7, Math.floor(((clientX - rect.left) / rect.width) * 8)));
    const y = Math.max(0, Math.min(7, Math.floor(((clientY - rect.top) / rect.height) * 8)));
    return xyToSquare(x, y, orientation);
  };

  const squares: Array<{ square: Square; x: number; y: number; piece: ReturnType<Chess['get']> }> = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = xyToSquare(x, y, orientation)!;
      squares.push({ square, x, y, piece: chess.get(square) });
    }
  }

  const arrowCoords = arrow ? { from: squareToXY(arrow.from, orientation), to: squareToXY(arrow.to, orientation) } : null;
  const ghostFrom = ghost ? squareToXY(ghost.from, orientation) : null;
  const ghostTo = ghost ? squareToXY(ghost.to, orientation) : null;

  return (
    <div className={`board-shell theme-${settings.boardTheme}`}>
      <div className="chess-board" ref={boardRef} role="grid" aria-label="Chess board">
        {squares.map(({ square, x, y, piece }) => {
          const fileIndex = FILES.indexOf(square[0]);
          const rank = Number(square[1]);
          const light = (fileIndex + rank) % 2 === 1;
          const isLast = settings.showLastMove && lastMove && (lastMove.from === square || lastMove.to === square);
          const hideForGhost = ghost?.to === square;
          return (
            <button
              type="button"
              className={`board-square ${light ? 'light' : 'dark'} ${selected === square ? 'selected' : ''} ${isLast ? 'last' : ''}`}
              style={{ left: `${x * 12.5}%`, top: `${y * 12.5}%` }}
              key={square}
              onClick={() => void onSquareClick(square)}
              aria-label={square}
            >
              {settings.showCoordinates && x === 0 && <span className="coord rank">{square[1]}</span>}
              {settings.showCoordinates && y === 7 && <span className="coord file">{square[0]}</span>}
              {settings.showLegalMoves && legalTargets.has(square) && <span className={`legal-dot ${piece ? 'capture' : ''}`} />}
              {piece && !hideForGhost && (
                <PieceImage
                  color={piece.color}
                  type={piece.type}
                  onDragStart={(event) => event.preventDefault()}
                  onPointerDown={(event) => {
                    if (!interactive || disabled || piece.color !== chess.turn()) return;
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    setDragFrom(square);
                    setSelected(square);
                  }}
                  onPointerUp={(event) => {
                    if (!dragFrom) return;
                    const target = squareFromPointer(event.clientX, event.clientY);
                    const from = dragFrom;
                    setDragFrom(null);
                    if (target) void tryMove(from, target);
                  }}
                />
              )}
            </button>
          );
        })}

        {arrowCoords && settings.showBestArrows && (
          <svg className="board-arrows" viewBox="0 0 8 8" aria-hidden="true">
            <defs>
              <marker id="arrow-head" markerWidth="4" markerHeight="4" refX="2.3" refY="1.5" orient="auto">
                <path d="M0,0 L0,3 L3,1.5 z" />
              </marker>
            </defs>
            <line
              x1={arrowCoords.from.x + 0.5}
              y1={arrowCoords.from.y + 0.5}
              x2={arrowCoords.to.x + 0.5}
              y2={arrowCoords.to.y + 0.5}
              markerEnd="url(#arrow-head)"
            />
          </svg>
        )}

        {ghost && ghostFrom && ghostTo && (
          <PieceImage
            color={ghost.color}
            type={ghost.type}
            className="ghost-piece"
            style={{
              left: 0,
              top: 0,
              transform: `translate(${(ghostEnd ? ghostTo.x : ghostFrom.x) * 100}%, ${(ghostEnd ? ghostTo.y : ghostFrom.y) * 100}%)`,
              transitionDuration: `${animationMs(settings)}ms`,
            }}
          />
        )}

        {promotion && (
          <div className="promotion-picker" role="dialog" aria-label="Choose promotion piece">
            {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((piece) => (
              <button key={piece} onClick={() => {
                const pending = promotion;
                setPromotion(null);
                void tryMove(pending.from, pending.to, piece);
              }}><PieceImage color={promotion.color} type={piece} /></button>
            ))}
            <button className="promotion-cancel" onClick={() => setPromotion(null)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
