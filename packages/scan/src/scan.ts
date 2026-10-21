/**
 * High-level scanning API: scanImage and deskewWithCorners.
 */
import { isHeic, decodeHeic } from './heic.js';
import { deskew, detectQuad } from './pipeline.js';
import { performOcr } from './ocr.js';
import { parseDocument } from './parser.js';
import { renderTemplate } from './templates.js';
import type {
  ScanCorners,
  ScanOptions,
  ScanResult,
  ScanToTemplateOptions,
  ScanToTemplateResult,
} from './types.js';

/**
 * Loads a Blob into an ImageBitmap or HTMLImageElement.
 */
async function loadImageSource(blob: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement
    }
  }

  if (typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        resolve({
          source: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          close: () => URL.revokeObjectURL(url),
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('[paperkit/scan] Failed to load image element'));
      };
      img.src = url;
    });
  }

  throw new Error('[paperkit/scan] Image loading is not supported in this environment.');
}

/**
 * Converts a source image to a Canvas with the original dimensions.
 */
function createSourceCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (document.createElement('canvas') as HTMLCanvasElement);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/**
 * Creates an ImageData of downscaled resolution for high-speed edge detection.
 */
function getScaledImageData(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  maxDimension: number,
): { imageData: ImageData; scale: number } {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const scale = Math.min(1, maxDimension / Math.max(w, h));
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);

  const tempCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(sw, sh)
      : (document.createElement('canvas') as HTMLCanvasElement);
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const ctx = tempCanvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.drawImage(sourceCanvas as any, 0, 0, sw, sh);
  const imageData = ctx.getImageData(0, 0, sw, sh);

  return { imageData, scale };
}

/**
 * Takes a photo or image of a paper and returns a deskewed, cropped paper sheet.
 *
 * @param file - File or Blob of JPEG, PNG, or HEIC format.
 * @param options - Configuration options (contrast normalization, threshold, etc.)
 */
export async function scanImage(file: File | Blob, options: ScanOptions = {}): Promise<ScanResult> {
  let workingBlob = file;

  // 1. Check & decode HEIC if needed
  if (await isHeic(workingBlob)) {
    workingBlob = await decodeHeic(workingBlob);
  }

  // 2. Load image into canvas
  const loaded = await loadImageSource(workingBlob);
  try {
    const srcCanvas = createSourceCanvas(loaded.source, loaded.width, loaded.height);
    const maxDim = options.maxDimension ?? 1200;
    const { imageData, scale } = getScaledImageData(srcCanvas, maxDim);

    // 3. Detect paper quadrilateral
    const detected = await detectQuad(imageData, options);

    // Map corners back to full resolution coordinates
    const invScale = 1 / scale;
    const fullCorners: ScanCorners = [
      {
        x: Math.round(detected.corners[0].x * invScale),
        y: Math.round(detected.corners[0].y * invScale),
      },
      {
        x: Math.round(detected.corners[1].x * invScale),
        y: Math.round(detected.corners[1].y * invScale),
      },
      {
        x: Math.round(detected.corners[2].x * invScale),
        y: Math.round(detected.corners[2].y * invScale),
      },
      {
        x: Math.round(detected.corners[3].x * invScale),
        y: Math.round(detected.corners[3].y * invScale),
      },
    ];

    const threshold = options.confidenceThreshold ?? 0.6;
    const needsFallback = options.forceManual || detected.confidence < threshold;

    if (needsFallback) {
      // Fallback: return original image with corner adjustment hook
      return {
        blob: workingBlob,
        width: loaded.width,
        height: loaded.height,
        corners: fullCorners,
        confidence: detected.confidence,
        fallback: true,
      };
    }

    // 4. Deskew and crop paper quad
    const deskewed = await deskew(srcCanvas, fullCorners, options);
    return {
      blob: deskewed.blob,
      width: deskewed.width,
      height: deskewed.height,
      corners: fullCorners,
      confidence: detected.confidence,
      fallback: false,
    };
  } finally {
    loaded.close();
  }
}

/**
 * Manually deskews an image using 4 user-adjusted corners.
 * Essential fallback hook when confidence is low or user refines edges.
 */
export async function deskewWithCorners(
  file: File | Blob,
  corners: ScanCorners,
  options: ScanOptions = {},
): Promise<ScanResult> {
  let workingBlob = file;
  if (await isHeic(workingBlob)) {
    workingBlob = await decodeHeic(workingBlob);
  }

  const loaded = await loadImageSource(workingBlob);
  try {
    const srcCanvas = createSourceCanvas(loaded.source, loaded.width, loaded.height);
    const deskewed = await deskew(srcCanvas, corners, options);
    return {
      blob: deskewed.blob,
      width: deskewed.width,
      height: deskewed.height,
      corners,
      confidence: 1.0,
      fallback: false,
    };
  } finally {
    loaded.close();
  }
}

/**
 * End-to-end scanner pipeline: scans/deskews an image, extracts text via 100% client-side OCR,
 * parses structured fields, and generates a tactile skeuomorphic paper template.
 */
export async function scanToTemplate(
  file: File | Blob,
  options: ScanToTemplateOptions = {},
): Promise<ScanToTemplateResult> {
  // 1. Scan / deskew image
  const scanRes = await scanImage(file, options);

  // 2. Client-side OCR on the deskewed paper
  const ocrRes = await performOcr(scanRes.blob, options.ocr);

  // 3. Classify and extract structured fields
  const document = parseDocument(ocrRes.text);

  // 4. Render into premade skeuomorphic SVG template
  const template = renderTemplate(document, options.templateKind);

  return {
    template,
    document,
    ocr: ocrRes,
    imageBlob: scanRes.blob,
  };
}
