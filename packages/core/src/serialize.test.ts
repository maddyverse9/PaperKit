import { describe, expect, it } from 'vitest';
import { clonePaper, PaperkitJSONError, parseBoardJSON, parsePaper } from './serialize.js';
import type { Paper } from './types.js';

describe('serialize', () => {
  const samplePaper: Paper = {
    id: 'p-1',
    image: {
      front: { src: 'https://example.com/front.png', width: 400, height: 600 },
      back: { src: 'https://example.com/back.png', width: 400, height: 600 },
    },
    size: { w: 200, h: 300 },
    transform: { x: 150, y: 250, rotation: 12, scale: 1 },
    z: 3,
    flipped: true,
    curl: { corner: 'tr', amount: 0.25 },
    meta: { title: 'Invoice #1024', tags: ['work', 'pdf'] },
  };

  it('clones a paper deeply without mutating the original', () => {
    const clone = clonePaper(samplePaper);
    expect(clone).toEqual(samplePaper);
    expect(clone).not.toBe(samplePaper);
    expect(clone.image).not.toBe(samplePaper.image);
    expect(clone.meta).not.toBe(samplePaper.meta);
  });

  it('validates and parses a valid paper', () => {
    const parsed = parsePaper(samplePaper);
    expect(parsed).toEqual(samplePaper);
  });

  it('validates and round-trips a valid board JSON', () => {
    const raw = {
      version: 1,
      papers: [samplePaper],
    };
    const jsonStr = JSON.stringify(raw);
    const parsed = parseBoardJSON(jsonStr);
    expect(parsed.version).toBe(1);
    expect(parsed.papers).toHaveLength(1);
    expect(parsed.papers[0]).toEqual(samplePaper);
  });

  it('rejects malformed boards', () => {
    expect(() => parseBoardJSON(null)).toThrow(PaperkitJSONError);
    expect(() => parseBoardJSON({ version: 2, papers: [] })).toThrow(/unsupported version/);
    expect(() => parseBoardJSON({ version: 1, papers: 'not an array' })).toThrow(
      /papers must be an array/,
    );
    expect(() =>
      parseBoardJSON({
        version: 1,
        papers: [{ id: 'p1' }, { id: 'p1' }],
      }),
    ).toThrow();
  });
});
