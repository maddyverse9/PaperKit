/**
 * Frame scheduling and object-URL helpers that rely only on globals present in
 * both browsers and Node (no DOM typings).
 */
import type { BlobLike } from './types.js';

/** Schedules callbacks for the next frame. Injectable for tests. */
export interface Scheduler {
  /** Schedule `cb` with a timestamp in ms. Returns a handle. */
  request(cb: (time: number) => void): unknown;
  /** Cancel a pending callback. */
  cancel(handle: unknown): void;
  /** Current time in ms. */
  now(): number;
}

interface FrameGlobals {
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  cancelAnimationFrame?: (h: number) => void;
  performance?: { now(): number };
}

/**
 * Default scheduler: `requestAnimationFrame` when available, otherwise a 16ms
 * timeout (Node, workers without rAF).
 */
export function defaultScheduler(): Scheduler {
  const g = globalThis as unknown as FrameGlobals;
  const now = () => (g.performance ? g.performance.now() : Date.now());
  if (g.requestAnimationFrame && g.cancelAnimationFrame) {
    const raf = g.requestAnimationFrame.bind(globalThis);
    const caf = g.cancelAnimationFrame.bind(globalThis);
    return { request: (cb) => raf(cb), cancel: (h) => caf(h as number), now };
  }
  return {
    request: (cb) => setTimeout(() => cb(now()), 16),
    cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    now,
  };
}

/**
 * A manual scheduler for tests: frames only run when `flush()` is called.
 */
export class ManualScheduler implements Scheduler {
  private queue = new Map<number, (t: number) => void>();
  private nextId = 1;
  /** Current fake time in ms. */
  time = 0;

  request(cb: (time: number) => void): number {
    const id = this.nextId++;
    this.queue.set(id, cb);
    return id;
  }

  cancel(handle: unknown): void {
    this.queue.delete(handle as number);
  }

  now(): number {
    return this.time;
  }

  /** Advance time by `ms` and run every callback queued before this call. */
  flush(ms = 16): void {
    this.time += ms;
    const pending = [...this.queue.values()];
    this.queue.clear();
    for (const cb of pending) cb(this.time);
  }

  /** Run frames until nothing is queued (or `maxFrames` is reached). */
  runAll(ms = 16, maxFrames = 1000): void {
    for (let i = 0; i < maxFrames && this.queue.size > 0; i++) this.flush(ms);
  }

  /** Number of pending callbacks. */
  get pending(): number {
    return this.queue.size;
  }
}

interface UrlGlobals {
  URL?: {
    createObjectURL?: (b: unknown) => string;
    revokeObjectURL?: (u: string) => void;
  };
}

/** Create an object URL for a blob. Throws if the environment lacks `URL.createObjectURL`. */
export function createObjectURL(blob: BlobLike): string {
  const api = (globalThis as unknown as UrlGlobals).URL;
  if (!api?.createObjectURL) {
    throw new Error('[paperkit] URL.createObjectURL is not available in this environment.');
  }
  return api.createObjectURL(blob);
}

/** Revoke an object URL, ignoring environments without support. */
export function revokeObjectURL(url: string): void {
  (globalThis as unknown as UrlGlobals).URL?.revokeObjectURL?.(url);
}
