/**
 * Pure geometry helpers. All angles in this module are in degrees unless the
 * name says otherwise.
 */
import type { Corner, Paper, Transform } from './types.js';

/** A 2D point. */
export interface Point {
  x: number;
  y: number;
}

/** Clamp `v` to the range `[min, max]`. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Degrees to radians. */
export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Radians to degrees. */
export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Normalize an angle in degrees to the range `(-180, 180]`. */
export function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a <= -180) a += 360;
  if (a > 180) a -= 360;
  return a;
}

/** Rotate a vector clockwise (screen coordinates, y down) by `deg`. */
export function rotateVec(v: Point, deg: number): Point {
  const r = toRad(deg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** Distance between two points. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Angle in degrees of the vector from `a` to `b`. */
export function angleBetween(a: Point, b: Point): number {
  return toDeg(Math.atan2(b.y - a.y, b.x - a.x));
}

/**
 * Convert a board-space point into a paper's local frame: origin at the paper
 * center, unrotated, unscaled (units are paper px at scale 1).
 */
export function toLocal(point: Point, t: Transform): Point {
  const v = rotateVec({ x: point.x - t.x, y: point.y - t.y }, -t.rotation);
  return { x: v.x / t.scale, y: v.y / t.scale };
}

/** Convert a point in a paper's local frame back to board space. */
export function toBoard(local: Point, t: Transform): Point {
  const v = rotateVec({ x: local.x * t.scale, y: local.y * t.scale }, t.rotation);
  return { x: v.x + t.x, y: v.y + t.y };
}

/** `true` if a board-space point lies on the paper's rectangle. */
export function containsPoint(paper: Paper, point: Point): boolean {
  const l = toLocal(point, paper.transform);
  return Math.abs(l.x) <= paper.size.w / 2 && Math.abs(l.y) <= paper.size.h / 2;
}

/** Local-frame position of a corner. */
export function cornerLocal(paper: Paper, corner: Corner): Point {
  const hw = paper.size.w / 2;
  const hh = paper.size.h / 2;
  return {
    x: corner === 'tl' || corner === 'bl' ? -hw : hw,
    y: corner === 'tl' || corner === 'tr' ? -hh : hh,
  };
}

/**
 * Which corner (if any) a board-space point is near.
 * @param hitSize - corner hit square size in **screen** px.
 */
export function hitCorner(paper: Paper, point: Point, hitSize: number): Corner | null {
  const l = toLocal(point, paper.transform);
  const s = hitSize / paper.transform.scale;
  const hw = paper.size.w / 2;
  const hh = paper.size.h / 2;
  if (Math.abs(l.x) > hw || Math.abs(l.y) > hh) return null;
  const nearLeft = l.x < -hw + s;
  const nearRight = l.x > hw - s;
  const nearTop = l.y < -hh + s;
  const nearBottom = l.y > hh - s;
  if (nearTop && nearLeft) return 'tl';
  if (nearTop && nearRight) return 'tr';
  if (nearBottom && nearLeft) return 'bl';
  if (nearBottom && nearRight) return 'br';
  return null;
}

/**
 * Board-space position of the rotate handle of a paper. The handle sits a fixed
 * number of **screen** px above the paper's top edge, regardless of scale.
 */
export function rotateHandlePosition(paper: Paper, offset: number): Point {
  const local = { x: 0, y: -paper.size.h / 2 - offset / paper.transform.scale };
  return toBoard(local, paper.transform);
}

/**
 * Curl amount for a corner drag: how far the pointer has travelled from the
 * corner toward the paper's center, normalized by the paper's shorter side.
 */
export function curlAmountFor(paper: Paper, corner: Corner, point: Point): number {
  const l = toLocal(point, paper.transform);
  const c = cornerLocal(paper, corner);
  // Inward diagonal direction (unit).
  const dir = { x: -Math.sign(c.x), y: -Math.sign(c.y) };
  const travelled = ((l.x - c.x) * dir.x + (l.y - c.y) * dir.y) / Math.SQRT2;
  const max = Math.min(paper.size.w, paper.size.h) * 0.5;
  return clamp(travelled / max, 0, 1);
}

/**
 * Size that fits `width x height` inside a `max x max` box, keeping the aspect
 * ratio. Never upscales.
 */
export function fitSize(width: number, height: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(width, height));
  return { w: Math.round(width * k), h: Math.round(height * k) };
}
