/**
 * The Board: owns paper state, interaction logic and the render loop.
 * Contains no DOM code. Everything is driven through {@link InputSink} and
 * testable in Node.
 */
import { Emitter, type Unsubscribe } from './emitter.js';
import { createObjectURL, defaultScheduler, revokeObjectURL, type Scheduler } from './env.js';
import {
  angleBetween,
  clamp,
  containsPoint,
  curlAmountFor,
  distance,
  fitSize,
  hitCorner,
  normalizeAngle,
  rotateHandlePosition,
  type Point,
} from './geometry.js';
import type {
  InputSink,
  Modifiers,
  PaperViewState,
  PointerInput,
  RenderFrame,
  RenderPaper,
  Renderer,
  RendererContext,
  WheelInput,
} from './renderer.js';
import { clonePaper, parseBoardJSON } from './serialize.js';
import { stepSpring, type SpringState } from './spring.js';
import type {
  BoardJSON,
  BlobImageInput,
  Corner,
  Curl,
  ID,
  ImageInput,
  ImageRef,
  Light,
  Paper,
  TextureOptions,
  Transform,
} from './types.js';

/** Options for {@link createBoard} / `new Board()`. */
export interface BoardOptions {
  /** Container passed to the renderer (an `HTMLElement` for `cssRenderer`). Mounts immediately if given. */
  container?: unknown;
  /** Renderer to draw with. Without one the board is headless (useful for tests and servers). */
  renderer?: Renderer;
  /** Longest side, in px, of a newly added paper when `size` isn't given. Default `360`. */
  maxPaperSize?: number;
  /** Max random rotation in degrees applied on drop and on add. `0` disables. Default `2`. */
  dropJitter?: number;
  /** Allowed scale range. Default `{ min: 0.25, max: 4 }`. */
  scaleBounds?: { min: number; max: number };
  /** Keep paper centers inside the viewport while dragging. Default `true`. */
  keepInBounds?: boolean;
  /** Global light. Default `{ angle: 315, elevation: 0.6 }` (top-left). */
  light?: Partial<Light>;
  /** Paper texture. `true`/`false` toggles everything. Default: grain and edge wear on. */
  texture?: boolean | Partial<TextureOptions>;
  /** Double-click / double-tap flips a paper. Default `true`. */
  doubleTapToFlip?: boolean;
  /** Corner curl hit area, in screen px. Default `28`. */
  cornerHitSize?: number;
  /** Rotate handle distance above the top edge, in screen px. Default `30`. */
  rotateHandleOffset?: number;
  /** Pointer travel, in px, before a press becomes a drag. Default `4`. */
  tapSlop?: number;
  /** Random source, `[0, 1)`. Inject for deterministic jitter. Default `Math.random`. */
  random?: () => number;
  /** Frame scheduler. Default: `requestAnimationFrame` or a timeout fallback. */
  scheduler?: Scheduler;
  /** ID generator for new papers. */
  idGenerator?: () => ID;
  /** Accessible label for a paper. Default: `meta.title` if it is a string, otherwise "Paper N". */
  getLabel?: (paper: Readonly<Paper>, index: number) => string;
  /** Force reduced motion on or off. Default `'auto'` (the renderer reports the user preference). */
  reducedMotion?: boolean | 'auto';
}

/** Input for {@link Board.addPaper}. */
export interface AddPaperInput {
  /** One image (front) or both sides. Blobs become object URLs owned by the board. */
  image: ImageInput | { front: ImageInput; back?: ImageInput };
  id?: ID;
  /** Size at scale 1. Default: the image fitted inside `maxPaperSize`. */
  size?: { w: number; h: number };
  /** Partial transform. Missing x/y place the paper near the viewport center. */
  transform?: Partial<Transform>;
  /** Stacking order. Default: on top. */
  z?: number;
  flipped?: boolean;
  curl?: Curl;
  meta?: Record<string, unknown>;
}

/** Where a change came from. */
export type ChangeSource = 'pointer' | 'keyboard' | 'wheel' | 'api';

/** Map of board events to payloads. */
export interface BoardEvents {
  'paper:added': { paper: Paper };
  'paper:removed': { paper: Paper };
  /** A committed transform change (position, rotation or scale). Pointer drags emit once, on drop. */
  'paper:moved': { paper: Paper; from: Transform; to: Transform; source: ChangeSource };
  'paper:lifted': { paper: Paper };
  'paper:dropped': { paper: Paper; moved: boolean };
  'paper:flipped': { paper: Paper; flipped: boolean };
  /** A tap/click (no drag) or keyboard activation (Enter/Space). */
  'paper:clicked': { paper: Paper; pointerType: string };
  'paper:selected': { paper: Paper | null };
  /** Persistent curl changed through `setCurl`. Live gesture curls are not persisted and don't emit this. */
  'paper:curled': { paper: Paper; curl: Curl | undefined };
  /** Any committed, persistable change. Handy for autosave. */
  change: { reason: string };
}

/** Event names, for convenience. */
export type BoardEventName = keyof BoardEvents;

/** Options for {@link Board.load} / {@link Board.fromJSON}. */
export interface LoadOptions {
  /**
   * Swap an image when restoring, for example to recreate object URLs after a
   * reload. Return `undefined` to keep the stored ref.
   */
  resolveImage?: (ref: ImageRef, paper: Paper, side: 'front' | 'back') => ImageInput | undefined;
}

type Gesture =
  | {
      kind: 'pending' | 'drag';
      id: ID;
      pointerId: number;
      start: Point;
      offset: Point;
      from: Transform;
      time: number;
    }
  | { kind: 'rotate'; id: ID; pointerId: number; startAngle: number; from: Transform }
  | { kind: 'curl'; id: ID; pointerId: number; corner: Corner }
  | {
      kind: 'pinch';
      id: ID;
      a: number;
      b: number;
      startDist: number;
      startAngle: number;
      startMid: Point;
      from: Transform;
      pinchFrom: Transform;
    };

interface LiveCurl {
  corner: Corner;
  spring: SpringState;
  /** Animating back to the persisted curl. */
  releasing: boolean;
}

const DEFAULT_LIGHT: Light = { angle: 315, elevation: 0.6 };
const DEFAULT_TEXTURE: TextureOptions = { grain: true, edgeWear: true };
const DOUBLE_TAP_MS = 320;
const ROTATE_HANDLE_HIT = 18;

let idCounter = 0;
function defaultId(): ID {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  idCounter += 1;
  return `p_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isBlobInput(v: ImageInput): v is BlobImageInput {
  return (
    typeof (v as { blob?: unknown }).blob === 'object' && (v as { blob?: unknown }).blob !== null
  );
}

function isTwoSided(v: AddPaperInput['image']): v is { front: ImageInput; back?: ImageInput } {
  return typeof (v as { front?: unknown }).front === 'object';
}

function textureFrom(t: BoardOptions['texture']): TextureOptions {
  if (t === undefined) return { ...DEFAULT_TEXTURE };
  if (typeof t === 'boolean') return { grain: t, edgeWear: t };
  return { ...DEFAULT_TEXTURE, ...t };
}

/**
 * A board of papers. Create with {@link createBoard} or `new Board(options)`.
 *
 * @example
 * ```ts
 * const board = createBoard({ container: el, renderer: cssRenderer() });
 * board.addPaper({ image: { src, width, height } });
 * const saved = board.toJSON();
 * ```
 */
export class Board {
  private readonly emitter = new Emitter<BoardEvents>();
  private readonly list: Paper[] = [];
  private readonly byId = new Map<ID, Paper>();
  private readonly views = new Map<ID, { lifted: boolean; dragging: boolean }>();
  private readonly liveCurls = new Map<ID, LiveCurl>();
  private readonly ownedUrls = new Map<ID, string[]>();
  private readonly pointers = new Map<number, Point>();
  private sortedCache: Paper[] | null = null;
  private gesture: Gesture | null = null;
  private lastTap: { id: ID; time: number } | null = null;
  private selected: ID | null = null;
  private viewport: { w: number; h: number } | null = null;
  private reducedMotionPref = false;
  private light: Light;
  private texture: TextureOptions;
  private renderer: Renderer | undefined;
  private mounted = false;
  private frameHandle: unknown = null;
  private lastFrameTime: number | null = null;
  private destroyed = false;
  private readonly opts: Required<
    Pick<
      BoardOptions,
      | 'maxPaperSize'
      | 'keepInBounds'
      | 'doubleTapToFlip'
      | 'cornerHitSize'
      | 'rotateHandleOffset'
      | 'tapSlop'
      | 'random'
      | 'idGenerator'
    >
  > & {
    dropJitter: number;
    scaleBounds: { min: number; max: number };
    reducedMotion: boolean | 'auto';
    getLabel: ((paper: Readonly<Paper>, index: number) => string) | undefined;
  };
  private readonly scheduler: Scheduler;

  /** Input sink for renderers. Hosts normally don't need this. */
  readonly input: InputSink;

  constructor(options: BoardOptions = {}) {
    this.opts = {
      maxPaperSize: options.maxPaperSize ?? 360,
      dropJitter: options.dropJitter ?? 2,
      scaleBounds: options.scaleBounds ?? { min: 0.25, max: 4 },
      keepInBounds: options.keepInBounds ?? true,
      doubleTapToFlip: options.doubleTapToFlip ?? true,
      cornerHitSize: options.cornerHitSize ?? 28,
      rotateHandleOffset: options.rotateHandleOffset ?? 30,
      tapSlop: options.tapSlop ?? 4,
      random: options.random ?? Math.random,
      idGenerator: options.idGenerator ?? defaultId,
      reducedMotion: options.reducedMotion ?? 'auto',
      getLabel: options.getLabel,
    };
    this.light = { ...DEFAULT_LIGHT, ...options.light };
    this.texture = textureFrom(options.texture);
    this.scheduler = options.scheduler ?? defaultScheduler();
    this.renderer = options.renderer;
    this.input = {
      pointerDown: (e) => this.onPointerDown(e),
      pointerMove: (e) => this.onPointerMove(e),
      pointerUp: (e) => this.onPointerUp(e, false),
      pointerCancel: (e) => this.onPointerUp(e, true),
      wheel: (e) => this.onWheel(e),
      key: (id, key, mods) => this.onKey(id, key, mods ?? {}),
    };
    if (options.container !== undefined && options.container !== null)
      this.mount(options.container);
  }

  // ---------------------------------------------------------------------------
  // Static
  // ---------------------------------------------------------------------------

  /**
   * Create a board from serialized JSON (object or string).
   * @throws `PaperkitJSONError` if the JSON is malformed.
   */
  static fromJSON(json: BoardJSON | string, options: BoardOptions & LoadOptions = {}): Board {
    const board = new Board(options);
    board.load(json, options);
    return board;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /** Subscribe to a board event. Returns an unsubscribe function. */
  on<K extends BoardEventName>(type: K, listener: (e: BoardEvents[K]) => void): Unsubscribe {
    return this.emitter.on(type, listener);
  }

  /** Subscribe to a single emission of a board event. */
  once<K extends BoardEventName>(type: K, listener: (e: BoardEvents[K]) => void): Unsubscribe {
    return this.emitter.once(type, listener);
  }

  /** Remove a listener. */
  off<K extends BoardEventName>(type: K, listener: (e: BoardEvents[K]) => void): void {
    this.emitter.off(type, listener);
  }

  // ---------------------------------------------------------------------------
  // Mounting
  // ---------------------------------------------------------------------------

  /** `true` while attached to a renderer container. */
  get isMounted(): boolean {
    return this.mounted;
  }

  /**
   * Attach the renderer to a container. Remounting moves the board to the new
   * container.
   * @throws if the board was created without a renderer.
   */
  mount(container: unknown): void {
    this.assertAlive();
    if (!this.renderer) throw new Error('[paperkit] Cannot mount: no renderer was provided.');
    if (this.mounted) this.unmount();
    const ctx: RendererContext = {
      input: this.input,
      getFrame: () => this.getFrame(),
      setViewport: (w, h) => {
        this.viewport = { w, h };
      },
      setReducedMotion: (r) => {
        this.reducedMotionPref = r;
        this.invalidate();
      },
      getLabel: (p) => this.labelFor(p),
    };
    this.renderer.mount(container, ctx);
    this.mounted = true;
    this.renderer.render(this.getFrame());
  }

  /** Detach from the current container. State is kept, so `mount()` can be called again. */
  unmount(): void {
    if (!this.mounted) return;
    this.cancelFrame();
    this.renderer?.unmount();
    this.mounted = false;
    this.pointers.clear();
    this.endGestureSilently();
  }

  /** Unmount, revoke every object URL the board created, and drop all listeners. */
  destroy(): void {
    if (this.destroyed) return;
    this.unmount();
    for (const urls of this.ownedUrls.values()) urls.forEach(revokeObjectURL);
    this.ownedUrls.clear();
    this.emitter.clear();
    this.destroyed = true;
  }

  // ---------------------------------------------------------------------------
  // Papers
  // ---------------------------------------------------------------------------

  /** Number of papers on the board. */
  get size(): number {
    return this.list.length;
  }

  /** ID of the selected paper, or `null`. */
  get selectedId(): ID | null {
    return this.selected;
  }

  /**
   * Add a paper. Blob images are turned into object URLs owned by the board.
   * @returns A snapshot of the new paper.
   */
  addPaper(input: AddPaperInput): Paper {
    this.assertAlive();
    const id = input.id ?? this.opts.idGenerator();
    if (this.byId.has(id)) throw new Error(`[paperkit] A paper with id "${id}" already exists.`);
    const sides = isTwoSided(input.image) ? input.image : { front: input.image };
    const front = this.toImageRef(sides.front, id);
    const back = sides.back ? this.toImageRef(sides.back, id) : undefined;
    const size = input.size
      ? { ...input.size }
      : fitSize(front.width, front.height, this.opts.maxPaperSize);
    const t = input.transform ?? {};
    const center = this.defaultCenter();
    const paper: Paper = {
      id,
      image: back ? { front, back } : { front },
      size,
      transform: {
        x: t.x ?? center.x,
        y: t.y ?? center.y,
        rotation: t.rotation ?? this.jitter(),
        scale: this.clampScale(t.scale ?? 1),
      },
      z: input.z ?? this.maxZ() + 1,
      flipped: input.flipped ?? false,
    };
    if (input.curl)
      paper.curl = { corner: input.curl.corner, amount: clamp(input.curl.amount, 0, 1) };
    if (input.meta !== undefined)
      paper.meta = JSON.parse(JSON.stringify(input.meta)) as Record<string, unknown>;
    this.insert(paper);
    const snap = clonePaper(paper);
    this.emitter.emit('paper:added', { paper: snap });
    this.changed('add');
    return clonePaper(paper);
  }

  /**
   * Remove a paper and revoke any object URLs the board created for it.
   * @returns `true` if a paper was removed.
   */
  removePaper(id: ID): boolean {
    const paper = this.byId.get(id);
    if (!paper) return false;
    if (this.gesture && this.gesture.id === id) this.endGestureSilently();
    this.list.splice(this.list.indexOf(paper), 1);
    this.byId.delete(id);
    this.views.delete(id);
    this.liveCurls.delete(id);
    this.sortedCache = null;
    this.ownedUrls.get(id)?.forEach(revokeObjectURL);
    this.ownedUrls.delete(id);
    if (this.selected === id) this.selected = null;
    this.emitter.emit('paper:removed', { paper: clonePaper(paper) });
    this.changed('remove');
    return true;
  }

  /** Remove every paper. */
  clear(): void {
    for (const p of [...this.list]) this.removePaper(p.id);
  }

  /** Snapshot of a paper, or `undefined`. */
  getPaper(id: ID): Paper | undefined {
    const p = this.byId.get(id);
    return p ? clonePaper(p) : undefined;
  }

  /** Snapshots of all papers, sorted bottom-to-top. */
  getPapers(): Paper[] {
    return this.sorted().map(clonePaper);
  }

  /** Top-most paper under a board-space point. */
  paperAt(x: number, y: number): Paper | undefined {
    const p = this.hitTest({ x, y });
    return p ? clonePaper(p) : undefined;
  }

  /** Update part of a paper's transform. Emits `paper:moved`. */
  setTransform(id: ID, patch: Partial<Transform>, source: ChangeSource = 'api'): void {
    const p = this.require(id);
    const from = { ...p.transform };
    p.transform = {
      x: patch.x ?? from.x,
      y: patch.y ?? from.y,
      rotation: patch.rotation ?? from.rotation,
      scale: this.clampScale(patch.scale ?? from.scale),
    };
    this.commitMove(p, from, source);
  }

  /** Move a paper's center to `(x, y)`. */
  movePaper(id: ID, x: number, y: number): void {
    this.setTransform(id, { x, y });
  }

  /** Set a paper's absolute rotation in degrees. */
  rotatePaper(id: ID, rotation: number): void {
    this.setTransform(id, { rotation });
  }

  /** Set a paper's absolute scale (clamped to `scaleBounds`). */
  scalePaper(id: ID, scale: number): void {
    this.setTransform(id, { scale });
  }

  /**
   * Flip a paper. Without `flipped`, toggles.
   * @returns The new flipped state.
   */
  flipPaper(id: ID, flipped?: boolean): boolean {
    const p = this.require(id);
    const next = flipped ?? !p.flipped;
    if (next === p.flipped) return next;
    p.flipped = next;
    this.emitter.emit('paper:flipped', { paper: clonePaper(p), flipped: next });
    this.changed('flip');
    return next;
  }

  /** Raise a paper above all others. No-op if it is already on top. */
  bringToFront(id: ID): void {
    const p = this.require(id);
    const top = this.sorted().at(-1);
    if (top === p) return;
    p.z = this.maxZ() + 1;
    this.sortedCache = null;
    this.changed('reorder');
  }

  /** Lower a paper below all others. */
  sendToBack(id: ID): void {
    const p = this.require(id);
    const bottom = this.sorted()[0];
    if (bottom === p) return;
    p.z = this.minZ() - 1;
    this.sortedCache = null;
    this.changed('reorder');
  }

  /** Set or clear (`null`) a persistent corner curl. */
  setCurl(id: ID, curl: Curl | null): void {
    const p = this.require(id);
    if (curl && curl.amount > 0) p.curl = { corner: curl.corner, amount: clamp(curl.amount, 0, 1) };
    else delete p.curl;
    this.emitter.emit('paper:curled', {
      paper: clonePaper(p),
      curl: p.curl ? { ...p.curl } : undefined,
    });
    this.changed('curl');
  }

  /** Replace a paper's opaque `meta`. Pass `undefined` to remove it. */
  setMeta(id: ID, meta: Record<string, unknown> | undefined): void {
    const p = this.require(id);
    if (meta === undefined) delete p.meta;
    else p.meta = JSON.parse(JSON.stringify(meta)) as Record<string, unknown>;
    this.changed('meta');
  }

  /** Select a paper (or clear the selection with `null`). */
  select(id: ID | null): void {
    if (id !== null) this.require(id);
    if (this.selected === id) return;
    this.selected = id;
    const p = id ? this.byId.get(id) : undefined;
    this.emitter.emit('paper:selected', { paper: p ? clonePaper(p) : null });
    this.invalidate();
  }

  // ---------------------------------------------------------------------------
  // Appearance
  // ---------------------------------------------------------------------------

  /** Current light. */
  getLight(): Light {
    return { ...this.light };
  }

  /** Update the global light. */
  setLight(light: Partial<Light>): void {
    this.light = { ...this.light, ...light };
    this.invalidate();
  }

  /** Current texture options. */
  getTexture(): TextureOptions {
    return { ...this.texture };
  }

  /** Update texture options. `true`/`false` toggles everything. */
  setTexture(texture: boolean | Partial<TextureOptions>): void {
    this.texture =
      typeof texture === 'boolean'
        ? { grain: texture, edgeWear: texture }
        : { ...this.texture, ...texture };
    this.invalidate();
  }

  /** Change the drop jitter (max degrees). */
  setDropJitter(degrees: number): void {
    this.opts.dropJitter = Math.max(0, degrees);
  }

  /** Effective reduced-motion state. */
  get reducedMotion(): boolean {
    return this.opts.reducedMotion === 'auto' ? this.reducedMotionPref : this.opts.reducedMotion;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /** Serialize the layout. Lossless: `Board.fromJSON(b.toJSON()).toJSON()` deep-equals `b.toJSON()`. */
  toJSON(): BoardJSON {
    return { version: 1, papers: this.list.map(clonePaper) };
  }

  /**
   * Replace all papers with the given serialized state. Emits `paper:removed`
   * and `paper:added` for each paper.
   */
  load(json: BoardJSON | string, options: LoadOptions = {}): void {
    this.assertAlive();
    const data = parseBoardJSON(json);
    this.clear();
    for (const paper of data.papers) {
      if (options.resolveImage) {
        const f = options.resolveImage(paper.image.front, paper, 'front');
        if (f) paper.image.front = this.toImageRef(f, paper.id);
        if (paper.image.back) {
          const b = options.resolveImage(paper.image.back, paper, 'back');
          if (b) paper.image.back = this.toImageRef(b, paper.id);
        }
      }
      this.insert(paper);
      this.emitter.emit('paper:added', { paper: clonePaper(paper) });
    }
    this.changed('load');
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /** Build the current render frame. */
  getFrame(): RenderFrame {
    const papers: RenderPaper[] = this.sorted().map((paper) => ({
      paper,
      view: this.viewOf(paper),
    }));
    return {
      papers,
      light: this.light,
      texture: this.texture,
      reducedMotion: this.reducedMotion,
      selectedId: this.selected,
      rotateHandleOffset: this.opts.rotateHandleOffset,
    };
  }

  private viewOf(paper: Paper): PaperViewState {
    const v = this.views.get(paper.id);
    const live = this.liveCurls.get(paper.id);
    let curl = paper.curl;
    if (live) {
      const amount = clamp(live.spring.value, 0, 1);
      curl = amount > 0.001 ? { corner: live.corner, amount } : undefined;
    }
    return {
      lifted: v?.lifted ?? false,
      dragging: v?.dragging ?? false,
      selected: this.selected === paper.id,
      curl,
    };
  }

  private invalidate(): void {
    if (this.frameHandle !== null || this.destroyed) return;
    if (!this.mounted && this.liveCurls.size === 0) return;
    this.frameHandle = this.scheduler.request((t) => this.frame(t));
  }

  private frame(time: number): void {
    this.frameHandle = null;
    const dt = this.lastFrameTime === null ? 16 : time - this.lastFrameTime;
    let animating = false;
    for (const [id, live] of this.liveCurls) {
      if (!live.releasing) continue;
      const done = this.reducedMotion || stepSpring(live.spring, dt);
      if (done) this.liveCurls.delete(id);
      else animating = true;
    }
    if (this.mounted) this.renderer?.render(this.getFrame());
    if (animating) {
      this.lastFrameTime = time;
      this.frameHandle = this.scheduler.request((t) => this.frame(t));
    } else {
      this.lastFrameTime = null;
    }
  }

  private cancelFrame(): void {
    if (this.frameHandle !== null) this.scheduler.cancel(this.frameHandle);
    this.frameHandle = null;
    this.lastFrameTime = null;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private onPointerDown(e: PointerInput): boolean {
    const pt = { x: e.x, y: e.y };
    const g = this.gesture;
    if (g) {
      if ((g.kind === 'pending' || g.kind === 'drag') && !this.pointers.has(e.pointerId)) {
        const first = this.pointers.get(g.pointerId);
        if (!first) return false;
        this.pointers.set(e.pointerId, pt);
        const p = this.require(g.id);
        this.setView(p.id, { dragging: true });
        this.gesture = {
          kind: 'pinch',
          id: g.id,
          a: g.pointerId,
          b: e.pointerId,
          startDist: Math.max(1, distance(first, pt)),
          startAngle: angleBetween(first, pt),
          startMid: { x: (first.x + pt.x) / 2, y: (first.y + pt.y) / 2 },
          from: g.from,
          pinchFrom: { ...p.transform },
        };
        return true;
      }
      return false;
    }

    // Rotate handle of the selected paper.
    if (this.selected) {
      const sel = this.byId.get(this.selected);
      if (
        sel &&
        distance(rotateHandlePosition(sel, this.opts.rotateHandleOffset), pt) <= ROTATE_HANDLE_HIT
      ) {
        this.pointers.set(e.pointerId, pt);
        this.gesture = {
          kind: 'rotate',
          id: sel.id,
          pointerId: e.pointerId,
          startAngle: angleBetween(sel.transform, pt),
          from: { ...sel.transform },
        };
        this.setView(sel.id, { dragging: true });
        return true;
      }
    }

    const paper = this.hitTest(pt);
    if (!paper) {
      this.select(null);
      return false;
    }
    this.pointers.set(e.pointerId, pt);
    this.bringToFront(paper.id);
    this.select(paper.id);

    const corner = hitCorner(paper, pt, this.opts.cornerHitSize);
    if (corner) {
      const base = paper.curl?.corner === corner ? paper.curl.amount : 0;
      this.liveCurls.set(paper.id, {
        corner,
        spring: {
          value: Math.max(base, curlAmountFor(paper, corner, pt)),
          velocity: 0,
          target: base,
        },
        releasing: false,
      });
      this.gesture = { kind: 'curl', id: paper.id, pointerId: e.pointerId, corner };
      this.invalidate();
      return true;
    }

    this.gesture = {
      kind: 'pending',
      id: paper.id,
      pointerId: e.pointerId,
      start: pt,
      offset: { x: pt.x - paper.transform.x, y: pt.y - paper.transform.y },
      from: { ...paper.transform },
      time: e.time,
    };
    this.setView(paper.id, { lifted: true });
    this.emitter.emit('paper:lifted', { paper: clonePaper(paper) });
    return true;
  }

  private onPointerMove(e: PointerInput): void {
    const g = this.gesture;
    if (!g || !this.pointers.has(e.pointerId)) return;
    const pt = { x: e.x, y: e.y };
    this.pointers.set(e.pointerId, pt);
    const p = this.byId.get(g.id);
    if (!p) return;

    switch (g.kind) {
      case 'pending':
      case 'drag': {
        if (e.pointerId !== g.pointerId) return;
        if (g.kind === 'pending') {
          if (distance(g.start, pt) <= this.opts.tapSlop) return;
          g.kind = 'drag';
          this.setView(p.id, { dragging: true });
        }
        const c = this.clampCenter({ x: pt.x - g.offset.x, y: pt.y - g.offset.y });
        p.transform.x = c.x;
        p.transform.y = c.y;
        break;
      }
      case 'rotate': {
        let rot = g.from.rotation + normalizeAngle(angleBetween(p.transform, pt) - g.startAngle);
        if (e.shift) rot = Math.round(rot / 15) * 15;
        p.transform.rotation = rot;
        break;
      }
      case 'curl': {
        const live = this.liveCurls.get(p.id);
        if (live) live.spring.value = Math.max(live.spring.target, curlAmountFor(p, g.corner, pt));
        break;
      }
      case 'pinch': {
        const a = this.pointers.get(g.a);
        const b = this.pointers.get(g.b);
        if (!a || !b) return;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const c = this.clampCenter({
          x: g.pinchFrom.x + (mid.x - g.startMid.x),
          y: g.pinchFrom.y + (mid.y - g.startMid.y),
        });
        p.transform = {
          x: c.x,
          y: c.y,
          rotation: g.pinchFrom.rotation + normalizeAngle(angleBetween(a, b) - g.startAngle),
          scale: this.clampScale((g.pinchFrom.scale * distance(a, b)) / g.startDist),
        };
        break;
      }
    }
    this.invalidate();
  }

  private onPointerUp(e: PointerInput, cancelled: boolean): void {
    const tracked = this.pointers.delete(e.pointerId);
    const g = this.gesture;
    if (!g || !tracked) return;
    const p = this.byId.get(g.id);
    if (!p) {
      this.gesture = null;
      return;
    }

    switch (g.kind) {
      case 'pending': {
        if (e.pointerId !== g.pointerId) return;
        this.gesture = null;
        this.setView(p.id, { lifted: false, dragging: false });
        this.emitter.emit('paper:dropped', { paper: clonePaper(p), moved: false });
        if (cancelled) break;
        this.emitter.emit('paper:clicked', {
          paper: clonePaper(p),
          pointerType: e.pointerType ?? 'mouse',
        });
        const last = this.lastTap;
        if (
          this.opts.doubleTapToFlip &&
          last &&
          last.id === p.id &&
          e.time - last.time <= DOUBLE_TAP_MS
        ) {
          this.lastTap = null;
          this.flipPaper(p.id);
        } else {
          this.lastTap = { id: p.id, time: e.time };
        }
        break;
      }
      case 'drag': {
        if (e.pointerId !== g.pointerId) return;
        this.gesture = null;
        this.lastTap = null;
        if (!cancelled) p.transform.rotation += this.jitter();
        this.setView(p.id, { lifted: false, dragging: false });
        this.commitMove(p, g.from, 'pointer');
        this.emitter.emit('paper:dropped', { paper: clonePaper(p), moved: true });
        break;
      }
      case 'rotate': {
        this.gesture = null;
        this.setView(p.id, { dragging: false });
        this.commitMove(p, g.from, 'pointer');
        break;
      }
      case 'curl': {
        this.gesture = null;
        const live = this.liveCurls.get(p.id);
        if (live) live.releasing = true;
        break;
      }
      case 'pinch': {
        this.gesture = null;
        this.lastTap = null;
        // Stop tracking the remaining finger so it doesn't start a new gesture mid-air.
        this.pointers.delete(g.a);
        this.pointers.delete(g.b);
        this.setView(p.id, { lifted: false, dragging: false });
        this.commitMove(p, g.from, 'pointer');
        this.emitter.emit('paper:dropped', { paper: clonePaper(p), moved: true });
        break;
      }
    }
    this.invalidate();
  }

  private onWheel(e: WheelInput): boolean {
    const p = this.hitTest({ x: e.x, y: e.y });
    if (!p) return false;
    if (e.ctrl || e.meta) {
      this.setTransform(p.id, { scale: p.transform.scale * Math.exp(-e.deltaY * 0.01) }, 'wheel');
      return true;
    }
    if (e.alt) {
      this.setTransform(p.id, { rotation: p.transform.rotation + e.deltaY * 0.25 }, 'wheel');
      return true;
    }
    return false;
  }

  private onKey(id: ID, key: string, mods: Modifiers): boolean {
    const p = this.byId.get(id);
    if (!p) return false;
    const step = mods.shift ? 50 : 10;
    const rotStep = mods.shift ? 15 : 5;
    const t = p.transform;
    switch (key) {
      case 'ArrowLeft':
        this.setTransform(id, this.clampCenter({ x: t.x - step, y: t.y }), 'keyboard');
        return true;
      case 'ArrowRight':
        this.setTransform(id, this.clampCenter({ x: t.x + step, y: t.y }), 'keyboard');
        return true;
      case 'ArrowUp':
        this.setTransform(id, this.clampCenter({ x: t.x, y: t.y - step }), 'keyboard');
        return true;
      case 'ArrowDown':
        this.setTransform(id, this.clampCenter({ x: t.x, y: t.y + step }), 'keyboard');
        return true;
      case 'q':
      case 'Q':
      case '[':
        this.setTransform(id, { rotation: t.rotation - rotStep }, 'keyboard');
        return true;
      case 'e':
      case 'E':
      case ']':
        this.setTransform(id, { rotation: t.rotation + rotStep }, 'keyboard');
        return true;
      case '+':
      case '=':
        this.setTransform(id, { scale: t.scale * 1.1 }, 'keyboard');
        return true;
      case '-':
      case '_':
        this.setTransform(id, { scale: t.scale / 1.1 }, 'keyboard');
        return true;
      case 'f':
      case 'F':
        this.flipPaper(id);
        return true;
      case 'PageUp':
        this.bringToFront(id);
        return true;
      case 'PageDown':
        this.sendToBack(id);
        return true;
      case 'Enter':
      case ' ':
        this.bringToFront(id);
        this.select(id);
        this.emitter.emit('paper:clicked', { paper: clonePaper(p), pointerType: 'keyboard' });
        return true;
      case 'Escape':
        if (this.selected === null) return false;
        this.select(null);
        return true;
      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private assertAlive(): void {
    if (this.destroyed) throw new Error('[paperkit] This board has been destroyed.');
  }

  private require(id: ID): Paper {
    const p = this.byId.get(id);
    if (!p) throw new Error(`[paperkit] No paper with id "${id}".`);
    return p;
  }

  private insert(paper: Paper): void {
    if (this.byId.has(paper.id))
      throw new Error(`[paperkit] A paper with id "${paper.id}" already exists.`);
    this.list.push(paper);
    this.byId.set(paper.id, paper);
    this.sortedCache = null;
  }

  private sorted(): Paper[] {
    if (!this.sortedCache) {
      const index = new Map(this.list.map((p, i) => [p, i]));
      this.sortedCache = [...this.list].sort((a, b) => a.z - b.z || index.get(a)! - index.get(b)!);
    }
    return this.sortedCache;
  }

  private hitTest(pt: Point): Paper | undefined {
    const s = this.sorted();
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i]!;
      if (containsPoint(p, pt)) return p;
    }
    return undefined;
  }

  private maxZ(): number {
    return this.list.reduce((m, p) => Math.max(m, p.z), 0);
  }

  private minZ(): number {
    return this.list.reduce((m, p) => Math.min(m, p.z), Infinity);
  }

  private setView(id: ID, patch: Partial<{ lifted: boolean; dragging: boolean }>): void {
    const v = this.views.get(id) ?? { lifted: false, dragging: false };
    Object.assign(v, patch);
    if (!v.lifted && !v.dragging) this.views.delete(id);
    else this.views.set(id, v);
    this.invalidate();
  }

  private endGestureSilently(): void {
    const g = this.gesture;
    this.gesture = null;
    if (!g) return;
    this.views.delete(g.id);
    this.liveCurls.delete(g.id);
  }

  private commitMove(p: Paper, from: Transform, source: ChangeSource): void {
    const to = p.transform;
    if (
      from.x === to.x &&
      from.y === to.y &&
      from.rotation === to.rotation &&
      from.scale === to.scale
    ) {
      this.invalidate();
      return;
    }
    this.emitter.emit('paper:moved', {
      paper: clonePaper(p),
      from: { ...from },
      to: { ...to },
      source,
    });
    this.changed('move');
  }

  private changed(reason: string): void {
    this.emitter.emit('change', { reason });
    this.invalidate();
  }

  private jitter(): number {
    const j = this.opts.dropJitter;
    return j > 0 ? (this.opts.random() * 2 - 1) * j : 0;
  }

  private clampScale(s: number): number {
    return clamp(s, this.opts.scaleBounds.min, this.opts.scaleBounds.max);
  }

  private clampCenter(c: Point): Point {
    if (!this.opts.keepInBounds || !this.viewport) return c;
    return { x: clamp(c.x, 0, this.viewport.w), y: clamp(c.y, 0, this.viewport.h) };
  }

  private defaultCenter(): Point {
    const vw = this.viewport?.w ?? 800;
    const vh = this.viewport?.h ?? 600;
    const n = this.list.length % 8;
    return { x: vw / 2 + (n - 3.5) * 22, y: vh / 2 + (n - 3.5) * 14 };
  }

  private toImageRef(input: ImageInput, ownerId: ID): ImageRef {
    if (!isBlobInput(input)) return { src: input.src, width: input.width, height: input.height };
    const src = createObjectURL(input.blob);
    const list = this.ownedUrls.get(ownerId) ?? [];
    list.push(src);
    this.ownedUrls.set(ownerId, list);
    return { src, width: input.width, height: input.height };
  }

  private labelFor(paper: Readonly<Paper>): string {
    const index = this.sorted().indexOf(paper as Paper);
    if (this.opts.getLabel) return this.opts.getLabel(paper, index);
    const title = paper.meta?.title;
    return typeof title === 'string' && title ? title : `Paper ${index + 1}`;
  }
}

/**
 * Create a board. Same as `new Board(options)`.
 *
 * @example
 * ```ts
 * import { createBoard } from '@paperkit/core';
 * import { cssRenderer } from '@paperkit/render-css';
 * const board = createBoard({ container: el, renderer: cssRenderer() });
 * ```
 */
export function createBoard(options: BoardOptions = {}): Board {
  return new Board(options);
}
