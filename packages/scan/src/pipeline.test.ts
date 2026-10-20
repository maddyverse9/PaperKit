import { describe, expect, it } from 'vitest';
import { defaultCornersFor, getQuadDimensions, orderPoints } from './pipeline.js';
import { isHeic } from './heic.js';

describe('scan pipeline', () => {
  it('correctly orders 4 points clockwise starting from top-left', () => {
    // Unordered points: [bottom-right, top-left, bottom-left, top-right]
    const unordered = [
      { x: 290, y: 395 }, // br
      { x: 10, y: 15 }, // tl
      { x: 15, y: 400 }, // bl
      { x: 300, y: 20 }, // tr
    ];

    const ordered = orderPoints(unordered);
    expect(ordered[0]).toEqual({ x: 10, y: 15 }); // tl
    expect(ordered[1]).toEqual({ x: 300, y: 20 }); // tr
    expect(ordered[2]).toEqual({ x: 290, y: 395 }); // br
    expect(ordered[3]).toEqual({ x: 15, y: 400 }); // bl
  });

  it('computes quad dimensions accurately', () => {
    const corners = orderPoints([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ]);

    const dims = getQuadDimensions(corners);
    expect(dims.width).toBe(100);
    expect(dims.height).toBe(200);
  });

  it('generates default inset corners', () => {
    const corners = defaultCornersFor(1000, 800, 0.1);
    expect(corners[0]).toEqual({ x: 100, y: 80 });
    expect(corners[1]).toEqual({ x: 900, y: 80 });
    expect(corners[2]).toEqual({ x: 900, y: 720 });
    expect(corners[3]).toEqual({ x: 100, y: 720 });
  });

  it('detects HEIC format based on MIME and extensions', async () => {
    const heicBlob = new Blob(['fake heic'], { type: 'image/heic' });
    expect(await isHeic(heicBlob)).toBe(true);

    const jpegBlob = new Blob(['fake jpeg'], { type: 'image/jpeg' });
    expect(await isHeic(jpegBlob)).toBe(false);
  });
});
