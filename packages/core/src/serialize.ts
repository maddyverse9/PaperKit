/**
 * Validation and cloning for the serialized board format.
 */
import type { BoardJSON, Corner, ImageRef, Paper } from './types.js';

/** Thrown when `Board.fromJSON` / `board.load` receives malformed data. */
export class PaperkitJSONError extends Error {
  constructor(message: string) {
    super(`[paperkit] Invalid board JSON: ${message}`);
    this.name = 'PaperkitJSONError';
  }
}

const CORNERS: readonly Corner[] = ['tl', 'tr', 'bl', 'br'];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new PaperkitJSONError(`${path} must be a finite number`);
  return v;
}

function imageRef(v: unknown, path: string): ImageRef {
  if (!isObj(v) || typeof v.src !== 'string')
    throw new PaperkitJSONError(`${path}.src must be a string`);
  return {
    src: v.src,
    width: num(v.width, `${path}.width`),
    height: num(v.height, `${path}.height`),
  };
}

/** Deep-clone a JSON-compatible value. */
function cloneJSON<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Deep-clone a paper. `meta` is cloned through JSON, so it must be JSON-compatible. */
export function clonePaper(p: Readonly<Paper>): Paper {
  const out: Paper = {
    id: p.id,
    image: { front: { ...p.image.front } },
    size: { w: p.size.w, h: p.size.h },
    transform: { ...p.transform },
    z: p.z,
    flipped: p.flipped,
  };
  if (p.image.back) out.image.back = { ...p.image.back };
  if (p.curl) out.curl = { corner: p.curl.corner, amount: p.curl.amount };
  if (p.meta !== undefined) out.meta = cloneJSON(p.meta);
  return out;
}

/** Validate a single serialized paper and return a clean copy. */
export function parsePaper(v: unknown, path = 'paper'): Paper {
  if (!isObj(v)) throw new PaperkitJSONError(`${path} must be an object`);
  if (typeof v.id !== 'string' || !v.id)
    throw new PaperkitJSONError(`${path}.id must be a non-empty string`);
  if (!isObj(v.image)) throw new PaperkitJSONError(`${path}.image must be an object`);
  if (!isObj(v.size)) throw new PaperkitJSONError(`${path}.size must be an object`);
  if (!isObj(v.transform)) throw new PaperkitJSONError(`${path}.transform must be an object`);
  const t = v.transform;
  const paper: Paper = {
    id: v.id,
    image: { front: imageRef(v.image.front, `${path}.image.front`) },
    size: { w: num(v.size.w, `${path}.size.w`), h: num(v.size.h, `${path}.size.h`) },
    transform: {
      x: num(t.x, `${path}.transform.x`),
      y: num(t.y, `${path}.transform.y`),
      rotation: num(t.rotation, `${path}.transform.rotation`),
      scale: num(t.scale, `${path}.transform.scale`),
    },
    z: num(v.z, `${path}.z`),
    flipped: v.flipped === true,
  };
  if (v.image.back !== undefined) paper.image.back = imageRef(v.image.back, `${path}.image.back`);
  if (v.curl !== undefined) {
    if (!isObj(v.curl) || !CORNERS.includes(v.curl.corner as Corner)) {
      throw new PaperkitJSONError(`${path}.curl.corner must be one of ${CORNERS.join(', ')}`);
    }
    paper.curl = {
      corner: v.curl.corner as Corner,
      amount: num(v.curl.amount, `${path}.curl.amount`),
    };
  }
  if (v.meta !== undefined) {
    if (!isObj(v.meta)) throw new PaperkitJSONError(`${path}.meta must be an object`);
    paper.meta = cloneJSON(v.meta);
  }
  return paper;
}

/**
 * Validate a serialized board. Accepts either an object or a JSON string.
 * @throws {@link PaperkitJSONError} on malformed input.
 */
export function parseBoardJSON(input: unknown): BoardJSON {
  const v: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  if (!isObj(v)) throw new PaperkitJSONError('root must be an object');
  if (v.version !== 1) throw new PaperkitJSONError(`unsupported version ${String(v.version)}`);
  if (!Array.isArray(v.papers)) throw new PaperkitJSONError('papers must be an array');
  const seen = new Set<string>();
  const papers = v.papers.map((p, i) => {
    const paper = parsePaper(p, `papers[${i}]`);
    if (seen.has(paper.id)) throw new PaperkitJSONError(`duplicate paper id "${paper.id}"`);
    seen.add(paper.id);
    return paper;
  });
  return { version: 1, papers };
}
