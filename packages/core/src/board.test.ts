import { describe, expect, it, vi } from 'vitest';
import { Board, createBoard } from './board.js';
import { ManualScheduler } from './env.js';
import type { Renderer } from './renderer.js';

describe('Board', () => {
  it('adds and retrieves papers with defaults', () => {
    const board = createBoard();
    board.addPaper({
      id: 'doc1',
      image: { src: 'blob:doc1', width: 400, height: 600 },
      meta: { title: 'My Receipt' },
    });

    expect(board.size).toBe(1);
    expect(board.getPaper('doc1')).toBeDefined();
    expect(board.getPaper('doc1')?.id).toBe('doc1');
    expect(board.getPaper('doc1')?.meta?.title).toBe('My Receipt');
    expect(board.getPaper('doc1')?.z).toBe(1);
  });

  it('prevents adding duplicate paper IDs', () => {
    const board = createBoard();
    board.addPaper({ id: 'p1', image: { src: 'test.jpg', width: 100, height: 100 } });
    expect(() => {
      board.addPaper({ id: 'p1', image: { src: 'test2.jpg', width: 100, height: 100 } });
    }).toThrow(/already exists/);
  });

  it('removes papers and handles clear', () => {
    const board = createBoard();
    board.addPaper({ id: 'p1', image: { src: '1.jpg', width: 100, height: 100 } });
    board.addPaper({ id: 'p2', image: { src: '2.jpg', width: 100, height: 100 } });
    expect(board.size).toBe(2);

    expect(board.removePaper('p1')).toBe(true);
    expect(board.size).toBe(1);
    expect(board.getPaper('p1')).toBeUndefined();

    board.clear();
    expect(board.size).toBe(0);
  });

  it('manages stacking order via bringToFront and sendToBack', () => {
    const board = createBoard();
    board.addPaper({ id: 'bottom', image: { src: '1.jpg', width: 100, height: 100 } });
    board.addPaper({ id: 'middle', image: { src: '2.jpg', width: 100, height: 100 } });
    board.addPaper({ id: 'top', image: { src: '3.jpg', width: 100, height: 100 } });

    let papers = board.getPapers();
    expect(papers.map((p) => p.id)).toEqual(['bottom', 'middle', 'top']);

    board.bringToFront('bottom');
    papers = board.getPapers();
    expect(papers.map((p) => p.id)).toEqual(['middle', 'top', 'bottom']);

    board.sendToBack('bottom');
    papers = board.getPapers();
    expect(papers.map((p) => p.id)).toEqual(['bottom', 'middle', 'top']);
  });

  it('supports flipping papers and emits paper:flipped event', () => {
    const board = createBoard();
    board.addPaper({ id: 'p1', image: { src: 'front.jpg', width: 100, height: 100 } });

    const spy = vi.fn();
    board.on('paper:flipped', spy);

    const flipped = board.flipPaper('p1');
    expect(flipped).toBe(true);
    expect(board.getPaper('p1')?.flipped).toBe(true);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ flipped: true }));

    board.flipPaper('p1', false);
    expect(board.getPaper('p1')?.flipped).toBe(false);
  });

  it('supports moving, rotating, and scaling with bounds clamp', () => {
    const board = createBoard({
      scaleBounds: { min: 0.5, max: 2.0 },
    });
    board.addPaper({
      id: 'p1',
      image: { src: '1.jpg', width: 100, height: 100 },
      transform: { x: 50, y: 50, rotation: 0, scale: 1 },
    });

    board.movePaper('p1', 120, 140);
    expect(board.getPaper('p1')?.transform.x).toBe(120);
    expect(board.getPaper('p1')?.transform.y).toBe(140);

    board.rotatePaper('p1', 45);
    expect(board.getPaper('p1')?.transform.rotation).toBe(45);

    board.scalePaper('p1', 10); // should clamp to 2.0
    expect(board.getPaper('p1')?.transform.scale).toBe(2.0);

    board.scalePaper('p1', 0.1); // should clamp to 0.5
    expect(board.getPaper('p1')?.transform.scale).toBe(0.5);
  });

  it('handles pointer drag gesture workflow', () => {
    const board = createBoard({ dropJitter: 0 });
    board.addPaper({
      id: 'p1',
      size: { w: 100, h: 100 },
      transform: { x: 200, y: 200, rotation: 0, scale: 1 },
      image: { src: '1.jpg', width: 100, height: 100 },
    });

    const movedSpy = vi.fn();
    const liftedSpy = vi.fn();
    const droppedSpy = vi.fn();
    board.on('paper:moved', movedSpy);
    board.on('paper:lifted', liftedSpy);
    board.on('paper:dropped', droppedSpy);

    // Pointer down on paper center
    const downResult = board.input.pointerDown({
      pointerId: 1,
      x: 200,
      y: 200,
      time: 100,
    });
    expect(downResult).toBe(true);
    expect(liftedSpy).toHaveBeenCalled();

    // Move past tapSlop
    board.input.pointerMove({
      pointerId: 1,
      x: 250,
      y: 280,
      time: 120,
    });

    // Paper moved in real-time
    expect(board.getPaper('p1')?.transform.x).toBe(250);
    expect(board.getPaper('p1')?.transform.y).toBe(280);

    // Drop
    board.input.pointerUp({
      pointerId: 1,
      x: 250,
      y: 280,
      time: 150,
    });

    expect(droppedSpy).toHaveBeenCalledWith(expect.objectContaining({ moved: true }));
    expect(movedSpy).toHaveBeenCalledTimes(1);
    expect(movedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.objectContaining({ x: 200, y: 200 }),
        to: expect.objectContaining({ x: 250, y: 280 }),
        source: 'pointer',
      }),
    );
  });

  it('handles double-tap to flip', () => {
    const board = createBoard({ doubleTapToFlip: true });
    board.addPaper({
      id: 'p1',
      size: { w: 100, h: 100 },
      transform: { x: 200, y: 200, rotation: 0, scale: 1 },
      image: { src: '1.jpg', width: 100, height: 100 },
    });

    // Tap 1
    board.input.pointerDown({ pointerId: 1, x: 200, y: 200, time: 100 });
    board.input.pointerUp({ pointerId: 1, x: 200, y: 200, time: 150 });
    expect(board.getPaper('p1')?.flipped).toBe(false);

    // Tap 2 within 320ms
    board.input.pointerDown({ pointerId: 1, x: 200, y: 200, time: 250 });
    board.input.pointerUp({ pointerId: 1, x: 200, y: 200, time: 280 });
    expect(board.getPaper('p1')?.flipped).toBe(true);
  });

  it('supports keyboard navigation and actions', () => {
    const board = createBoard();
    board.addPaper({
      id: 'p1',
      size: { w: 100, h: 100 },
      transform: { x: 200, y: 200, rotation: 0, scale: 1 },
      image: { src: '1.jpg', width: 100, height: 100 },
    });

    // Arrow keys move
    board.input.key('p1', 'ArrowRight');
    expect(board.getPaper('p1')?.transform.x).toBe(210);

    board.input.key('p1', 'ArrowDown', { shift: true });
    expect(board.getPaper('p1')?.transform.y).toBe(250);

    // Q/E rotates
    board.input.key('p1', 'e');
    expect(board.getPaper('p1')?.transform.rotation).toBe(5);

    // F flips
    board.input.key('p1', 'f');
    expect(board.getPaper('p1')?.flipped).toBe(true);
  });

  it('supports wheel zoom with meta/ctrl key', () => {
    const board = createBoard();
    board.addPaper({
      id: 'p1',
      size: { w: 100, h: 100 },
      transform: { x: 200, y: 200, rotation: 0, scale: 1 },
      image: { src: '1.jpg', width: 100, height: 100 },
    });

    const handled = board.input.wheel({
      x: 200,
      y: 200,
      deltaY: -50,
      ctrl: true,
    });
    expect(handled).toBe(true);
    expect(board.getPaper('p1')?.transform.scale).toBeGreaterThan(1);
  });

  it('serializes to JSON and restores layout losslessly', () => {
    const board1 = createBoard();
    board1.addPaper({
      id: 'sheet1',
      image: { front: { src: 'sheet.png', width: 400, height: 500 } },
      size: { w: 200, h: 250 },
      transform: { x: 150, y: 300, rotation: 15, scale: 1.2 },
      z: 5,
      flipped: false,
      curl: { corner: 'tl', amount: 0.3 },
      meta: { author: 'Alice', notes: 'Important tax form' },
    });

    const json = board1.toJSON();
    const board2 = Board.fromJSON(json);

    expect(board2.toJSON()).toEqual(json);
    const restoredPaper = board2.getPaper('sheet1');
    expect(restoredPaper?.meta).toEqual({ author: 'Alice', notes: 'Important tax form' });
    expect(restoredPaper?.curl).toEqual({ corner: 'tl', amount: 0.3 });
  });

  it('animates corner curl release with spring', () => {
    const scheduler = new ManualScheduler();
    const mockRenderer: Renderer = {
      mount: vi.fn(),
      render: vi.fn(),
      unmount: vi.fn(),
    };

    const board = createBoard({
      scheduler,
      renderer: mockRenderer,
      container: {},
    });

    board.addPaper({
      id: 'p1',
      size: { w: 200, h: 200 },
      transform: { x: 200, y: 200, rotation: 0, scale: 1 },
      image: { src: '1.jpg', width: 200, height: 200 },
    });

    // Pointer down on bottom-right corner (300, 300)
    board.input.pointerDown({
      pointerId: 1,
      x: 295,
      y: 295,
      time: 0,
    });

    // Pointer move curls the corner
    board.input.pointerMove({
      pointerId: 1,
      x: 250,
      y: 250,
      time: 50,
    });

    let frame = board.getFrame();
    expect(frame.papers[0]?.view.curl).toBeDefined();
    expect(frame.papers[0]?.view.curl?.amount).toBeGreaterThan(0);

    // Release corner
    board.input.pointerUp({
      pointerId: 1,
      x: 250,
      y: 250,
      time: 100,
    });

    // Advance animation
    scheduler.runAll(16, 50);

    // Curl should have settled back
    frame = board.getFrame();
    expect(frame.papers[0]?.view.curl).toBeUndefined();
  });
});
