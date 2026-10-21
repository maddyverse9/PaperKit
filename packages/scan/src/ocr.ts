/**
 * Client-side OCR text recognition powered by Tesseract.js (Wasm / Web Worker).
 *
 * Runs 100% locally in the browser. Zero network calls; images never leave the device.
 * Incorporates OpenCV-based binarization, DPI upscaling, and Page Segmentation Mode tuning.
 */
import { createWorker, type Worker } from 'tesseract.js';
import { getOpenCv } from './pipeline.js';
import type { OcrOptions, OcrResult } from './types.js';

let activeWorker: Worker | null = null;
let activeWorkerLang: string | null = null;

/**
 * Gets or initializes a cached Tesseract.js worker instance.
 */
export async function getOcrWorker(
  lang = 'eng',
  onProgress?: (progress: { status: string; progress: number }) => void,
): Promise<Worker> {
  if (activeWorker && activeWorkerLang === lang) {
    return activeWorker;
  }

  if (activeWorker) {
    try {
      await activeWorker.terminate();
    } catch {
      // Ignore termination failure
    }
    activeWorker = null;
  }

  activeWorker = await createWorker(lang, 1, {
    logger: (m: any) => {
      if (onProgress && m && typeof m.progress === 'number') {
        onProgress({ status: m.status || 'processing', progress: m.progress });
      }
    },
  });
  activeWorkerLang = lang;
  return activeWorker;
}

/**
 * Terminates the cached OCR worker to free memory.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (activeWorker) {
    try {
      await activeWorker.terminate();
    } catch {
      // Ignore
    }
    activeWorker = null;
    activeWorkerLang = null;
  }
}

/**
 * Preprocesses an image using OpenCV to dramatically enhance OCR accuracy on receipts/bills:
 * - Upscales low-res screenshots (brings character heights to Tesseract's optimal ~30px range)
 * - Converts to grayscale
 * - Applies Otsu thresholding / binarization for clean black-on-white text
 */
async function preprocessForOcr(
  imageSource: Blob | File | HTMLCanvasElement | OffscreenCanvas | string,
): Promise<HTMLCanvasElement | Blob | File | OffscreenCanvas | string> {
  if (typeof document === 'undefined') return imageSource;

  try {
    const cv = await getOpenCv();
    if (!cv || !cv.Mat) return imageSource;

    let srcCanvas: HTMLCanvasElement;
    if (typeof HTMLCanvasElement !== 'undefined' && imageSource instanceof HTMLCanvasElement) {
      srcCanvas = imageSource;
    } else {
      const img = new Image();
      const url =
        typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource as Blob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for OCR preprocessing'));
        img.src = url;
      });

      if (typeof imageSource !== 'string') URL.revokeObjectURL(url);

      srcCanvas = document.createElement('canvas');
      srcCanvas.width = img.naturalWidth;
      srcCanvas.height = img.naturalHeight;
      const ctx = srcCanvas.getContext('2d');
      if (!ctx) return imageSource;
      ctx.drawImage(img, 0, 0);
    }

    const src = cv.imread(srcCanvas);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Upscale narrow receipts or low-DPI screenshots (2x) so character x-height >= 25px
    let workingMat = gray;
    if (src.cols < 1400) {
      const upscaled = new cv.Mat();
      const targetW = Math.round(src.cols * 2);
      const targetH = Math.round(src.rows * 2);
      cv.resize(gray, upscaled, new cv.Size(targetW, targetH), 0, 0, cv.INTER_CUBIC);
      gray.delete();
      workingMat = upscaled;
    }

    // Otsu binarization produces sharp high-contrast black characters on white paper
    const binary = new cv.Mat();
    cv.threshold(workingMat, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

    const outCanvas = document.createElement('canvas');
    cv.imshow(outCanvas, binary);

    src.delete();
    workingMat.delete();
    binary.delete();

    return outCanvas;
  } catch (err) {
    console.warn('[paperkit/scan] OCR preprocessing fallback to raw image:', err);
    return imageSource;
  }
}

/**
 * Performs client-side OCR on a given image source (Blob, File, Canvas, or image URL).
 */
export async function performOcr(
  imageSource: Blob | File | HTMLCanvasElement | OffscreenCanvas | string,
  options?: OcrOptions,
): Promise<OcrResult> {
  const lang = options?.lang ?? 'eng';
  const worker = await getOcrWorker(lang, options?.onProgress);

  // Configure Page Segmentation Mode and spaces for structured columnar text
  try {
    await worker.setParameters({
      // PSM 4: Assume a single column of text of variable sizes (avoids cross-column line merging on receipts)
      tessedit_pageseg_mode: (options?.psm ?? '4') as any,
      preserve_interword_spaces: '1',
    });
  } catch {
    // Graceful fallback if setParameters is unsupported
  }

  // Preprocess image with OpenCV binarization & upscaling unless explicitly disabled
  const inputToOcr =
    options?.preprocess !== false ? await preprocessForOcr(imageSource) : imageSource;

  const res = await worker.recognize(inputToOcr as any);
  const text = res.data.text || '';
  const confidence = typeof res.data.confidence === 'number' ? res.data.confidence : 85;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    text,
    confidence,
    lines,
  };
}
