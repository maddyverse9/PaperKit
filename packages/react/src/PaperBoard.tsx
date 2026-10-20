import React, { useEffect, useRef } from 'react';
import {
  type Board,
  type BoardOptions,
  type ChangeSource,
  type Paper,
  type Transform,
  createBoard,
} from '@paperkit/core';
import { cssRenderer } from '@paperkit/render-css';

export interface PaperBoardProps {
  /** Existing board instance. If omitted, a board is created automatically with `options`. */
  board?: Board;
  /** Options used if board is created automatically. */
  options?: BoardOptions;
  /** Callback fired when a paper is clicked or tapped. */
  onPaperClick?: (paper: Paper) => void;
  /** Callback fired when a paper's transform changes (on drop). */
  onPaperMove?: (e: { paper: Paper; from: Transform; to: Transform; source: ChangeSource }) => void;
  /** Callback fired when a paper is lifted. */
  onPaperLift?: (paper: Paper) => void;
  /** Callback fired when a paper is dropped. */
  onPaperDrop?: (e: { paper: Paper; moved: boolean }) => void;
  /** Callback fired when a paper is flipped. */
  onPaperFlip?: (e: { paper: Paper; flipped: boolean }) => void;
  /** Callback fired when paper selection changes. */
  onPaperSelect?: (paper: Paper | null) => void;
  /** Callback fired on any board data change. */
  onChange?: (e: { reason: string }) => void;

  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * React wrapper component for Paperkit Board.
 *
 * @example
 * ```tsx
 * import { PaperBoard, useBoard } from '@paperkit/react';
 *
 * function App() {
 *   const board = useBoard();
 *   return (
 *     <PaperBoard
 *       board={board}
 *       onPaperClick={(p) => console.log('Clicked paper:', p.id)}
 *       style={{ width: '100vw', height: '100vh' }}
 *     />
 *   );
 * }
 * ```
 */
export const PaperBoard: React.FC<PaperBoardProps> = ({
  board: externalBoard,
  options,
  onPaperClick,
  onPaperMove,
  onPaperLift,
  onPaperDrop,
  onPaperFlip,
  onPaperSelect,
  onChange,
  className,
  style,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalBoardRef = useRef<Board | null>(null);

  // Active board is either external or created internally
  const board =
    externalBoard ??
    internalBoardRef.current ??
    (internalBoardRef.current = createBoard({
      renderer: cssRenderer(),
      ...options,
    }));

  // Mount/unmount board into DOM container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    board.mount(el);

    return () => {
      board.unmount();
    };
  }, [board]);

  // Clean up internally created board on unmount
  useEffect(() => {
    return () => {
      if (internalBoardRef.current) {
        internalBoardRef.current.unmount();
      }
    };
  }, []);

  // Event wiring
  useEffect(() => {
    const unsubClick = onPaperClick
      ? board.on('paper:clicked', (e) => onPaperClick(e.paper))
      : undefined;

    const unsubMove = onPaperMove ? board.on('paper:moved', onPaperMove) : undefined;
    const unsubLift = onPaperLift
      ? board.on('paper:lifted', (e) => onPaperLift(e.paper))
      : undefined;
    const unsubDrop = onPaperDrop ? board.on('paper:dropped', onPaperDrop) : undefined;
    const unsubFlip = onPaperFlip ? board.on('paper:flipped', onPaperFlip) : undefined;
    const unsubSelect = onPaperSelect
      ? board.on('paper:selected', (e) => onPaperSelect(e.paper))
      : undefined;
    const unsubChange = onChange ? board.on('change', onChange) : undefined;

    return () => {
      unsubClick?.();
      unsubMove?.();
      unsubLift?.();
      unsubDrop?.();
      unsubFlip?.();
      unsubSelect?.();
      unsubChange?.();
    };
  }, [
    board,
    onPaperClick,
    onPaperMove,
    onPaperLift,
    onPaperDrop,
    onPaperFlip,
    onPaperSelect,
    onChange,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
