import type { Point } from '@paperkit/core';

/**
 * 4 corners of a quadrilateral in clockwise order:
 * [topLeft, topRight, bottomRight, bottomLeft]
 */
export type ScanCorners = [Point, Point, Point, Point];

/**
 * Configuration options for the image scanning pipeline.
 */
export interface ScanOptions {
  /**
   * Whether to normalize contrast / brightness to enhance text legibility.
   * Default: `true`
   */
  normalizeContrast?: boolean;

  /**
   * Maximum dimension in px to downscale image to during contour analysis.
   * Speeds up edge detection significantly while preserving quad precision.
   * Default: `1200`
   */
  maxDimension?: number;

  /**
   * Minimum confidence score (0 to 1) required to automatically apply the deskew crop.
   * If confidence is below this, returns fallback mode with manual corner adjust hook.
   * Default: `0.6`
   */
  confidenceThreshold?: number;

  /**
   * Output MIME type for the cropped paper image.
   * Default: `'image/png'`
   */
  outputType?: 'image/png' | 'image/jpeg' | 'image/webp';

  /**
   * Quality (0 to 1) for JPEG or WebP output.
   * Default: `0.92`
   */
  quality?: number;

  /**
   * Force manual mode even if a high-confidence quad is detected.
   */
  forceManual?: boolean;
}

/**
 * Output of scanImage() pipeline.
 */
export interface ScanResult {
  /** The resulting image blob (deskewed paper, or original image if fallback). */
  blob: Blob;
  /** Width in pixels of the output image. */
  width: number;
  /** Height in pixels of the output image. */
  height: number;
  /** The 4 detected or adjusted corners in coordinates of the source image. */
  corners: ScanCorners;
  /** Confidence score between 0 and 1. */
  confidence: number;
  /** True if confidence was below threshold and fallback was triggered. */
  fallback?: boolean;
}
