import { useEffect, useRef, useState } from 'react';
import { createBoard, type Board, type BoardOptions, type Paper } from '@paperkit/core';
import { cssRenderer } from '@paperkit/render-css';

/**
 * Creates and manages a Board instance tied to a component's lifecycle.
 */
export function useBoard(options: BoardOptions = {}): Board {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [board] = useState(() => {
    return createBoard({
      renderer: cssRenderer(),
      ...optionsRef.current,
    });
  });

  useEffect(() => {
    return () => {
      board.unmount();
    };
  }, [board]);

  return board;
}

/**
 * Subscribes to the list of papers on a board, updating whenever papers are added,
 * removed, moved, or reordered.
 */
export function useBoardPapers(board: Board): Paper[] {
  const [papers, setPapers] = useState<Paper[]>(() => board.getPapers());

  useEffect(() => {
    const update = () => {
      setPapers(board.getPapers());
    };

    update();
    const unsub1 = board.on('paper:added', update);
    const unsub2 = board.on('paper:removed', update);
    const unsub3 = board.on('paper:moved', update);
    const unsub4 = board.on('paper:flipped', update);
    const unsub5 = board.on('change', update);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [board]);

  return papers;
}

/**
 * Subscribes to a single paper on a board by ID.
 */
export function usePaper(board: Board, id: string): Paper | undefined {
  const [paper, setPaper] = useState<Paper | undefined>(() => board.getPaper(id));

  useEffect(() => {
    const update = () => {
      setPaper(board.getPaper(id));
    };

    update();
    const unsub1 = board.on('paper:moved', (e) => {
      if (e.paper.id === id) update();
    });
    const unsub2 = board.on('paper:flipped', (e) => {
      if (e.paper.id === id) update();
    });
    const unsub3 = board.on('paper:removed', (e) => {
      if (e.paper.id === id) update();
    });
    const unsub4 = board.on('change', update);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [board, id]);

  return paper;
}
