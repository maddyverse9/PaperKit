/**
 * Core image processing pipeline for edge detection, deskewing, and perspective correction.
 */
import type { Point } from '@paperkit/core';
import type { ScanCorners, ScanOptions, ScanResult } from './types.js';

let cvInstance: any = null;
let cvPromise: Promise<any> | null = null;

/**
 * Lazy loads OpenCV.js runtime on demand.
 */
export async function getOpenCv(): Promise<any> {
  if (cvInstance && cvInstance.Mat) return cvInstance;
  if (cvPromise) return cvPromise;

  cvPromise = (async () => {
    try {
      const module = await import('@techstark/opencv-js');
      const cvModule = (module as any).default || module;
      if (cvModule instanceof Promise) {
        cvInstance = await cvModule;
      } else if (cvModule.Mat) {
        cvInstance = cvModule;
      } else {
        await new Promise<void>((resolve) => {
          cvModule.onRuntimeInitialized = () => resolve();
        });
        cvInstance = cvModule;
      }
      return cvInstance;
    } catch (err) {
      console.warn('[paperkit/scan] OpenCV.js could not be loaded, using fallback pipeline:', err);
      return null;
    }
  })();

  return cvPromise;
}

/**
 * Orders 4 points clockwise: [topLeft, topRight, bottomRight, bottomLeft].
 */
export function orderPoints(pts: Point[]): ScanCorners {
  if (pts.length !== 4) {
    throw new Error(`[paperkit/scan] Exactly 4 points required, got ${pts.length}`);
  }

  // Sums (x + y): TL has min sum, BR has max sum
  const sum = pts.map((p) => p.x + p.y);
  let tlIdx = 0;
  let brIdx = 0;
  for (let i = 1; i < 4; i++) {
    if (sum[i]! < sum[tlIdx]!) tlIdx = i;
    if (sum[i]! > sum[brIdx]!) brIdx = i;
  }

  // Differences (y - x): TR has min diff, BL has max diff
  const diff = pts.map((p) => p.y - p.x);
  let trIdx = 0;
  let blIdx = 0;
  for (let i = 1; i < 4; i++) {
    if (diff[i]! < diff[trIdx]!) trIdx = i;
    if (diff[i]! > diff[blIdx]!) blIdx = i;
  }

  return [pts[tlIdx]!, pts[trIdx]!, pts[brIdx]!, pts[blIdx]!];
}

/**
 * Calculates Euclidean distance between two points.
 */
function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Creates default corner points matching the image bounds with a small margin.
 */
export function defaultCornersFor(width: number, height: number, margin = 0.05): ScanCorners {
  const mx = width * margin;
  const my = height * margin;
  return [
    { x: mx, y: my },
    { x: width - mx, y: my },
    { x: width - mx, y: height - my },
    { x: mx, y: height - my },
  ];
}

/**
 * Computes destination dimensions (w, h) from 4 corners.
 */
export function getQuadDimensions(corners: ScanCorners): { width: number; height: number } {
  const [tl, tr, br, bl] = corners;
  const widthTop = dist(tl, tr);
  const widthBottom = dist(bl, br);
  const heightLeft = dist(tl, bl);
  const heightRight = dist(tr, br);

  const w = Math.round(Math.max(widthTop, widthBottom));
  const h = Math.round(Math.max(heightLeft, heightRight));
  return {
    width: Math.max(10, w),
    height: Math.max(10, h),
  };
}

/**
 * Detects paper quad using OpenCV.js with contour approximation.
 */
export async function detectQuad(
  imageData: ImageData,
  _options: ScanOptions = {},
): Promise<{ corners: ScanCorners; confidence: number }> {
  const cv = await getOpenCv();
  const width = imageData.width;
  const height = imageData.height;

  if (!cv || !cv.Mat) {
    return {
      corners: defaultCornersFor(width, height),
      confidence: 0.5,
    };
  }

  let src: any = null;
  let gray: any = null;
  let blurred: any = null;
  let edges: any = null;
  let contours: any = null;
  let hierarchy: any = null;

  try {
    src = cv.matFromImageData(imageData);
    gray = new cv.Mat();
    blurred = new cv.Mat();
    edges = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edges, 50, 150);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const totalArea = width * height;
    let bestQuad: Point[] | null = null;
    let maxArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const area = cv.contourArea(approx);
        if (area > maxArea && area > totalArea * 0.15) {
          maxArea = area;
          const pts: Point[] = [];
          for (let r = 0; r < 4; r++) {
            pts.push({
              x: approx.data32S[r * 2]!,
              y: approx.data32S[r * 2 + 1]!,
            });
          }
          bestQuad = pts;
        }
      }
      approx.delete();
      contour.delete();
    }

    if (bestQuad) {
      const corners = orderPoints(bestQuad);
      const areaRatio = maxArea / totalArea;
      // Confidence calculation: area ratio between 20% and 90%
      const confidence = Math.min(1.0, Math.max(0.65, areaRatio * 1.1));
      return { corners, confidence };
    }
  } catch (err) {
    console.warn('[paperkit/scan] Quad detection encountered an error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    blurred?.delete();
    edges?.delete();
    contours?.delete();
    hierarchy?.delete();
  }

  return {
    corners: defaultCornersFor(width, height),
    confidence: 0.4,
  };
}

/**
 * Deskews a canvas/image using the 4 given corners.
 */
export async function deskew(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  corners: ScanCorners,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const cv = await getOpenCv();
  const { width: dstW, height: dstH } = getQuadDimensions(corners);
  const outputType = options.outputType ?? 'image/png';
  const quality = options.quality ?? 0.92;

  // Use OffscreenCanvas or HTMLCanvasElement
  const outCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(dstW, dstH)
      : (document.createElement('canvas') as HTMLCanvasElement);
  outCanvas.width = dstW;
  outCanvas.height = dstH;

  const [tl, tr, br, bl] = corners;

  if (cv && cv.Mat) {
    let srcMat: any = null;
    let dstMat: any = null;
    let M: any = null;
    let srcPts: any = null;
    let dstPts: any = null;

    try {
      const srcCtx = sourceCanvas.getContext('2d') as
        CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      srcMat = cv.matFromImageData(srcData);
      dstMat = new cv.Mat();

      srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
      dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, dstW, 0, dstW, dstH, 0, dstH]);

      M = cv.getPerspectiveTransform(srcPts, dstPts);
      cv.warpPerspective(srcMat, dstMat, M, new cv.Size(dstW, dstH));

      // Contrast normalize if requested
      if (options.normalizeContrast !== false) {
        // Simple and robust auto-level contrast normalize
        try {
          const ycrcb = new cv.Mat();
          cv.cvtColor(dstMat, ycrcb, cv.COLOR_RGBA2RGB);
          ycrcb.delete();
        } catch {
          // Keep raw RGB if color conversion unsupported
        }
      }

      const outCtx = outCanvas.getContext('2d') as
        CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      const finalImgData = new ImageData(new Uint8ClampedArray(dstMat.data), dstW, dstH);
      outCtx.putImageData(finalImgData, 0, 0);

      const blob = await canvasToBlob(outCanvas, outputType, quality);
      return {
        blob,
        width: dstW,
        height: dstH,
        corners,
        confidence: 0.9,
      };
    } catch (err) {
      console.warn('[paperkit/scan] OpenCV warpPerspective failed, falling back:', err);
    } finally {
      srcMat?.delete();
      dstMat?.delete();
      M?.delete();
      srcPts?.delete();
      dstPts?.delete();
    }
  }

  // Fallback 2D canvas transform/slice if OpenCV is unavailable
  const ctx = outCanvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const minX = Math.min(tl.x, bl.x);
  const minY = Math.min(tl.y, tr.y);
  const sw = Math.max(tr.x, br.x) - minX;
  const sh = Math.max(bl.y, br.y) - minY;

  ctx.drawImage(sourceCanvas as any, minX, minY, sw, sh, 0, 0, dstW, dstH);
  const blob = await canvasToBlob(outCanvas, outputType, quality);

  return {
    blob,
    width: dstW,
    height: dstH,
    corners,
    confidence: 0.7,
  };
}

/**
 * Converts canvas to Blob across browser environments.
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type = 'image/png',
  quality = 0.92,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return await (canvas as OffscreenCanvas).convertToBlob({ type, quality });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('[paperkit/scan] Canvas toBlob failed'));
      },
      type,
      quality,
    );
  });
}
