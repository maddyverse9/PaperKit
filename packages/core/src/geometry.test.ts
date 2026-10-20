import { describe, expect, it } from 'vitest';
import {
  clamp,
  containsPoint,
  curlAmountFor,
  fitSize,
  hitCorner,
  normalizeAngle,
  rotateHandlePosition,
  rotateVec,
  toBoard,
  toLocal,
} from './geometry.js';
import type { Paper } from './types.js';

describe('geometry', () => {
  it('clamps numbers within [min, max]', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('normalizes angles to (-180, 180]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(181)).toBe(-179);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-180)).toBe(180);
  });

  it('rotates vectors correctly', () => {
    const v = { x: 10, y: 0 };
    const r90 = rotateVec(v, 90);
    expect(Math.round(r90.x)).toBe(0);
    expect(Math.round(r90.y)).toBe(10);
  });

  it('transforms points to local and back to board space', () => {
    const transform = { x: 100, y: 100, rotation: 45, scale: 2 };
    const boardPt = { x: 120, y: 120 };
    const local = toLocal(boardPt, transform);
    const restored = toBoard(local, transform);
    expect(restored.x).toBeCloseTo(boardPt.x, 5);
    expect(restored.y).toBeCloseTo(boardPt.y, 5);
  });

  it('tests point containment in paper', () => {
    const paper: Paper = {
      id: 'p1',
      image: { front: { src: 'test.jpg', width: 200, height: 100 } },
      size: { w: 200, h: 100 },
      transform: { x: 300, y: 300, rotation: 0, scale: 1 },
      z: 1,
      flipped: false,
    };

    expect(containsPoint(paper, { x: 300, y: 300 })).toBe(true);
    expect(containsPoint(paper, { x: 390, y: 340 })).toBe(true);
    expect(containsPoint(paper, { x: 405, y: 300 })).toBe(false);
  });

  it('detects corners correctly', () => {
    const paper: Paper = {
      id: 'p1',
      image: { front: { src: 'test.jpg', width: 200, height: 100 } },
      size: { w: 200, h: 100 },
      transform: { x: 300, y: 300, rotation: 0, scale: 1 },
      z: 1,
      flipped: false,
    };

    // Top-left is at (300 - 100, 300 - 50) = (200, 250)
    expect(hitCorner(paper, { x: 205, y: 255 }, 20)).toBe('tl');
    // Top-right is at (400, 250)
    expect(hitCorner(paper, { x: 395, y: 255 }, 20)).toBe('tr');
    // Center is not a corner
    expect(hitCorner(paper, { x: 300, y: 300 }, 20)).toBeNull();
  });

  it('computes rotate handle position', () => {
    const paper: Paper = {
      id: 'p1',
      image: { front: { src: 'test.jpg', width: 200, height: 100 } },
      size: { w: 200, h: 100 },
      transform: { x: 300, y: 300, rotation: 0, scale: 1 },
      z: 1,
      flipped: false,
    };

    const handle = rotateHandlePosition(paper, 30);
    // Center (300, 300), height is 100 -> top edge is 250 -> 30px above is 220
    expect(handle.x).toBeCloseTo(300);
    expect(handle.y).toBeCloseTo(220);
  });

  it('computes curl amount for corner gestures', () => {
    const paper: Paper = {
      id: 'p1',
      image: { front: { src: 'test.jpg', width: 200, height: 200 } },
      size: { w: 200, h: 200 },
      transform: { x: 300, y: 300, rotation: 0, scale: 1 },
      z: 1,
      flipped: false,
    };

    // br corner is (400, 400). Moving toward center (300, 300)
    const amount = curlAmountFor(paper, 'br', { x: 350, y: 350 });
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThanOrEqual(1);
  });

  it('fits size within max dimension maintaining aspect ratio', () => {
    expect(fitSize(1000, 500, 500)).toEqual({ w: 500, h: 250 });
    expect(fitSize(300, 600, 300)).toEqual({ w: 150, h: 300 });
    expect(fitSize(100, 100, 500)).toEqual({ w: 100, h: 100 });
  });
});
