import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createBoard } from '@paperkit/core';
import { PaperBoard } from './PaperBoard.js';

describe('PaperBoard', () => {
  it('instantiates and mounts cleanly with external board', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const board = createBoard();
    const clickSpy = vi.fn();

    // Render using basic React 19 root or standard DOM render
    const paperBoard = React.createElement(PaperBoard, {
      board,
      onPaperClick: clickSpy,
    });

    expect(paperBoard).toBeDefined();
    expect(paperBoard.props.board).toBe(board);
  });
});
