/**
 * Public data model for Paperkit.
 *
 * Everything in this file is plain, JSON-serializable data. Nothing here
 * references the DOM, so it can be used in Node, workers, or any renderer.
 *
 * @packageDocumentation
 */

/** Opaque identifier for a paper. */
export type ID = string;

/** The four corners of a paper, in the paper's local (visual) frame. */
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

/**
 * A reference to an image the browser can load.
 *
 * `src` may be any URL the host keeps available: `blob:`, `data:` or `https:`.
 * The library never fetches, uploads or stores it.
 */
export interface ImageRef {
  /** URL the renderer will load. */
  src: string;
  /** Intrinsic pixel width of the image. */
  width: number;
  /** Intrinsic pixel height of the image. */
  height: number;
}

/**
 * Minimal structural type for a `Blob`. Keeps `@paperkit/core` free of DOM
 * typings while still accepting real `Blob` / `File` objects.
 */
export interface BlobLike {
  readonly size: number;
  readonly type: string;
}

/**
 * An image given as raw bytes, for example the output of `scanImage()`.
 * Core turns it into an object URL and revokes that URL when the paper is
 * removed or the board is destroyed.
 */
export interface BlobImageInput {
  blob: BlobLike;
  width: number;
  height: number;
}

/** Anything that can be turned into an {@link ImageRef}. */
export type ImageInput = ImageRef | BlobImageInput;

/** Position, rotation and scale of a paper on the board. */
export interface Transform {
  /** Board-space x of the paper's **center**, in CSS px. */
  x: number;
  /** Board-space y of the paper's **center**, in CSS px. */
  y: number;
  /** Clockwise rotation in **degrees**. */
  rotation: number;
  /** Uniform scale factor. `1` renders the paper at `size`. */
  scale: number;
}

/** A persistent corner curl ("dog-ear"). */
export interface Curl {
  corner: Corner;
  /** Curl strength, `0..1`. */
  amount: number;
}

/** A single sheet of paper on the board. */
export interface Paper {
  id: ID;
  image: { front: ImageRef; back?: ImageRef };
  /** Size in px at scale 1. */
  size: { w: number; h: number };
  transform: Transform;
  /** Stacking order. Higher is on top; ties are broken by array order. */
  z: number;
  /** `true` when the back side is showing. */
  flipped: boolean;
  curl?: Curl;
  /** Opaque, host-owned data. The library never reads it. */
  meta?: Record<string, unknown>;
}

/**
 * The serialized form of a board, as returned by `board.toJSON()`.
 *
 * Named `BoardJSON` instead of `Board` (as in the spec) so it doesn't clash
 * with the `Board` class. See docs/decisions/002-board-json-shape.md.
 */
export interface BoardJSON {
  /** Schema version, bumped on breaking changes to the JSON shape. */
  version: 1;
  papers: Paper[];
}

/** Global light used by renderers for shadows and shading. */
export interface Light {
  /**
   * Direction the light **comes from**, in degrees, measured clockwise from
   * "up" (screen top). `315` means top-left.
   */
  angle: number;
  /** How high the light is, `0..1`. Lower light means longer shadows. */
  elevation: number;
}

/** Paper surface texture settings. */
export interface TextureOptions {
  /** Subtle grain/noise overlay. */
  grain: boolean;
  /** Darkened, slightly worn edges. */
  edgeWear: boolean;
}
