/**
 * The boundary between `@paperkit/core` and any renderer.
 *
 * Core never touches the DOM. A renderer receives a {@link RendererContext}
 * on mount, forwards normalized input to it, and draws {@link RenderFrame}s.
 */
import type { ID, Light, Paper, TextureOptions } from './types.js';

/** Keyboard/pointer modifier keys. */
export interface Modifiers {
  shift?: boolean;
  alt?: boolean;
  ctrl?: boolean;
  meta?: boolean;
}

/** A normalized pointer event in **board** coordinates (CSS px from the board's top-left). */
export interface PointerInput extends Modifiers {
  pointerId: number;
  x: number;
  y: number;
  /** Timestamp in ms (any monotonic clock). */
  time: number;
  pointerType?: 'mouse' | 'touch' | 'pen' | string;
}

/** A normalized wheel event in board coordinates. */
export interface WheelInput extends Modifiers {
  x: number;
  y: number;
  deltaY: number;
}

/** Per-paper, non-persisted view state. */
export interface PaperViewState {
  /** Picked up: render bigger with a softer, deeper shadow. */
  lifted: boolean;
  /** Being moved directly by a pointer; renderers should disable transform transitions. */
  dragging: boolean;
  /** Currently selected paper. */
  selected: boolean;
  /**
   * Effective curl to draw. Includes live gesture/spring curl, so it can
   * differ from the persisted `paper.curl`.
   */
  curl: Paper['curl'];
}

/** One paper as the renderer should draw it. */
export interface RenderPaper {
  paper: Readonly<Paper>;
  view: Readonly<PaperViewState>;
}

/** A full snapshot of what to draw. Papers are sorted bottom-to-top. */
export interface RenderFrame {
  papers: readonly RenderPaper[];
  light: Readonly<Light>;
  texture: Readonly<TextureOptions>;
  reducedMotion: boolean;
  selectedId: ID | null;
  /** Rotate handle distance above the top edge, in screen px. */
  rotateHandleOffset: number;
}

/** Input sink the renderer forwards normalized events to. */
export interface InputSink {
  /** @returns `true` if the board captured the pointer (renderer should capture it and prevent defaults). */
  pointerDown(e: PointerInput): boolean;
  pointerMove(e: PointerInput): void;
  pointerUp(e: PointerInput): void;
  pointerCancel(e: PointerInput): void;
  /** @returns `true` if handled (renderer should `preventDefault`). */
  wheel(e: WheelInput): boolean;
  /** @returns `true` if handled (renderer should `preventDefault`). */
  key(paperId: ID, key: string, mods?: Modifiers): boolean;
}

/** What a renderer receives from the board on mount. */
export interface RendererContext {
  /** Forward user input here. */
  input: InputSink;
  /** Current snapshot (also delivered through `Renderer.render`). */
  getFrame(): RenderFrame;
  /** Report the board's visible size in CSS px, used for drag bounds and default placement. */
  setViewport(width: number, height: number): void;
  /** Report the user's reduced-motion preference. */
  setReducedMotion(reduced: boolean): void;
  /** Ask for an accessible label for a paper. */
  getLabel(paper: Readonly<Paper>): string;
}

/** A pluggable renderer, for example `cssRenderer()` from `@paperkit/render-css`. */
export interface Renderer {
  /** Attach to a host-specific container (an `HTMLElement` for the CSS renderer). */
  mount(container: unknown, ctx: RendererContext): void;
  /** Draw a frame. Called at most once per animation frame. */
  render(frame: RenderFrame): void;
  /** Detach and clean up everything created in `mount`. */
  unmount(): void;
}
