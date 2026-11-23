export type ToolView = 'encode' | 'decode';

export type OutputFormat = 'dataUri' | 'raw' | 'css' | 'html';

export interface ImageInfo {
  /** data:image/...;base64,... for the loaded image */
  dataUri: string;
  /** MIME type, e.g. image/png */
  mimeType: string;
  /** Raw Base64 payload (no prefix) */
  base64: string;
  /** Original file name, when loaded from a file */
  fileName: string;
  /** Original binary size in bytes */
  originalBytes: number;
  /** Natural width of the image */
  width: number;
  /** Natural height of the image */
  height: number;
}

export interface ToolState {
  /** Active view. */
  view: ToolView;
  /** Current output rendering mode. */
  outputFormat: OutputFormat;
  /** Encoded image, when one is loaded. */
  image: ImageInfo | null;
  /** Last encode/decode error message. */
  error: string | null;
}

export const DEFAULT_STATE: ToolState = {
  view: 'encode',
  outputFormat: 'dataUri',
  image: null,
  error: null,
};

export const MAX_STATE_BYTES = 400_000;

const MIME_RE = /^image\/[a-z0-9.+-]+$/i;

export function sanitizeMimeType(input: unknown): string {
  return typeof input === 'string' && MIME_RE.test(input) ? input.toLowerCase() : 'image/png';
}

export function detectMimeType(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'bmp':
      return 'image/bmp';
    case 'ico':
      return 'image/x-icon';
    case 'avif':
      return 'image/avif';
    case 'tif':
    case 'tiff':
      return 'image/tiff';
    default:
      return 'application/octet-stream';
  }
}

/** Detect the MIME type from a data URI prefix; empty string when unrecognized. */
export function detectMimeFromDataUri(dataUri: string): string {
  const match = /(^|\n)data:([^;,\n]+)[;,]/.exec(dataUri);
  const mime = match?.[2];
  return mime ? mime : '';
}

/** Base64-encode a binary payload as a chunked string for large inputs. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** File extension for a MIME type. */
export function extForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/bmp':
      return 'bmp';
    case 'image/x-icon':
      return 'ico';
    case 'image/avif':
      return 'avif';
    case 'image/tiff':
      return 'tiff';
    default:
      return 'png';
  }
}

export interface SizeInfo {
  originalBytes: number;
  base64Bytes: number;
  /** Percentage overhead of the Base64 payload vs the binary original. */
  overheadPercent: number;
}

/** Compare the original binary size to the encoded Base64 size. */
export function sizeComparison(originalBytes: number, base64: string): SizeInfo {
  const base64Bytes = base64.length;
  const overheadPercent =
    originalBytes > 0 ? ((base64Bytes - originalBytes) / originalBytes) * 100 : 0;
  return { originalBytes, base64Bytes, overheadPercent };
}

/** Format a byte count in a human friendly way. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Validate a Base64 string (with or without data URI prefix), returning details. */
export interface Base64Validation {
  valid: boolean;
  base64: string;
  mimeType: string;
}

export function normalizeBase64Input(input: string): Base64Validation {
  const trimmed = input.trim().replace(/\s+/g, '');

  const dataUriPrefix = /^data:([^;,]+);base64,/i.exec(trimmed);
  let base64 = trimmed;
  let mimeType = '';
  if (dataUriPrefix && dataUriPrefix[1]) {
    mimeType = dataUriPrefix[1];
    base64 = trimmed.slice(dataUriPrefix[0].length);
  }

  if (base64.length === 0) return { valid: false, base64: '', mimeType };

  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const shape = /^[A-Za-z0-9+/]+={0,2}$/.exec(normalized);
  if (!shape || shape[0] !== normalized) {
    return { valid: false, base64: '', mimeType };
  }

  try {
    atob(normalized);
  } catch {
    return { valid: false, base64: '', mimeType };
  }

  return { valid: true, base64: normalized, mimeType };
}

export interface OutputTexts {
  dataUri: string;
  raw: string;
  css: string;
  html: string;
}

/** Build all output renderings for an encoded image. */
export function outputTexts(info: ImageInfo): OutputTexts {
  return {
    dataUri: info.dataUri,
    raw: info.base64,
    css: `background-image: url("${info.dataUri}");`,
    html: `<img src="${info.dataUri}" alt="${info.fileName}" width="${info.width}" height="${info.height}" />`,
  };
}

/** Short human-readable summary of the current encode result. */
export function summaryText(state: ToolState): string {
  if (state.error) return state.error;
  if (!state.image) return 'Load an image to encode';
  const info = state.image;
  return `data:image/${info.mimeType}; base64 payload — ${formatBytes(info.originalBytes)} original`;
}

/** Read image natural dimensions from a data URI; null when the image cannot load. */
export function readImageDimensions(dataUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = dataUri;
  });
}
