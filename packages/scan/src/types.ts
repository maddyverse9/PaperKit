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

/**
 * Real-time progress updates during OCR text recognition.
 */
export interface OcrProgress {
  status: string;
  progress: number;
}

/**
 * Options for client-side OCR recognition.
 */
export interface OcrOptions {
  /** Tesseract language model. Default: 'eng' */
  lang?: string;
  /** Progress callback */
  onProgress?: (progress: OcrProgress) => void;
  /** Page segmentation mode ('4' for single column / receipts, '6' for uniform block, '3' for auto). Default: '4' */
  psm?: string;
  /** Whether to apply OpenCV binarization and DPI upscaling before OCR. Default: true */
  preprocess?: boolean;
}

/**
 * Result of client-side OCR.
 */
export interface OcrResult {
  /** Full raw extracted text. */
  text: string;
  /** Average recognition confidence (0 to 100). */
  confidence: number;
  /** Cleaned, non-empty text lines. */
  lines: string[];
}

/**
 * Individual line item on a receipt.
 */
export interface ReceiptItem {
  name: string;
  qty?: number;
  price: number;
}

/**
 * Structured receipt document model.
 */
export interface ReceiptDoc {
  kind: 'receipt';
  merchant: string;
  address?: string;
  date?: string;
  orderNumber?: string;
  items: ReceiptItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  currency: string;
  footer?: string;
}

/**
 * Individual charge line on a bill / invoice.
 */
export interface BillItem {
  description: string;
  amount: number;
}

/**
 * Structured bill or invoice document model.
 */
export interface BillDoc {
  kind: 'bill';
  company: string;
  billTo?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  status: 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING';
  items: BillItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  currency: string;
}

/**
 * Structured memo or note document model.
 */
export interface MemoDoc {
  kind: 'memo';
  title: string;
  date?: string;
  lines: string[];
  signature?: string;
  variant?: 'legal' | 'stationery';
}

/**
 * Union of all supported extracted document models.
 */
export type ExtractedDoc = ReceiptDoc | BillDoc | MemoDoc;

/**
 * Supported premade template styles.
 */
export type TemplateKind = 'receipt' | 'bill' | 'legal-memo' | 'stationery-note';

/**
 * Rendered template paper ready to be placed on a PaperBoard.
 */
export interface RenderedTemplate {
  /** The generated raw SVG markup. */
  svg: string;
  /** Data URL for direct image rendering. */
  dataUrl: string;
  /** Intrinsic pixel width. */
  width: number;
  /** Intrinsic pixel height. */
  height: number;
  /** Display title for the paper. */
  title: string;
  /** Template style used. */
  kind: TemplateKind;
}

/**
 * Options for scanToTemplate() pipeline.
 */
export interface ScanToTemplateOptions extends ScanOptions {
  ocr?: OcrOptions;
  templateKind?: TemplateKind;
}

/**
 * Output of scanToTemplate() pipeline.
 */
export interface ScanToTemplateResult {
  /** The rendered tactile template paper */
  template: RenderedTemplate;
  /** The parsed structured data */
  document: ExtractedDoc;
  /** The OCR text and confidence */
  ocr: OcrResult;
  /** The processed input image blob */
  imageBlob: Blob;
}
