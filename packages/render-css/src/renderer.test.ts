import { describe, expect, it } from 'vitest';
import { createBoard, ManualScheduler } from '@paperkit/core';
import { cssRenderer } from './renderer.js';

describe('cssRenderer', () => {
  it('mounts to a container element and updates DOM', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const scheduler = new ManualScheduler();
    const renderer = cssRenderer();
    const board = createBoard({
      container,
      renderer,
      scheduler,
    });

    expect(container.classList.contains('paperkit-board')).toBe(true);

    board.addPaper({
      id: 'doc-1',
      image: { src: 'https://example.com/receipt.jpg', width: 200, height: 300 },
      size: { w: 200, h: 300 },
      transform: { x: 100, y: 150, rotation: 10, scale: 1 },
      meta: { title: 'My Receipt' },
    });
    scheduler.flush();

    const paperEl = container.querySelector('[data-paper-id="doc-1"]') as HTMLElement;
    expect(paperEl).not.toBeNull();
    expect(paperEl.getAttribute('aria-label')).toBe('My Receipt');
    expect(paperEl.style.width).toBe('200px');
    expect(paperEl.style.height).toBe('300px');

    // Flip paper
    board.flipPaper('doc-1');
    scheduler.flush();
    expect(paperEl.classList.contains('paperkit-flipped')).toBe(true);

    // Remove paper
    board.removePaper('doc-1');
    scheduler.flush();
    const removedPaperEl = container.querySelector('[data-paper-id="doc-1"]');
    expect(removedPaperEl).toBeNull();

    // Unmount
    board.unmount();
    expect(container.classList.contains('paperkit-board')).toBe(false);
  });
});
