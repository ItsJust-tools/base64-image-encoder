import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_STATE_BYTES,
  normalizeBase64Input,
  outputTexts,
  sanitizeMimeType,
  sizeComparison,
  summaryText,
  type ImageInfo,
  type OutputFormat,
  type ToolState,
  type ToolView,
} from './types';

const VALID_VIEWS: ToolView[] = ['encode', 'decode'];
const VALID_FORMATS: OutputFormat[] = ['dataUri', 'raw', 'css', 'html'];

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    view: state.view,
    outputFormat: state.outputFormat,
    image: state.image,
    error: state.error,
  });
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function validImage(value: unknown): ImageInfo | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const dataUri = typeof v.dataUri === 'string' ? v.dataUri : '';
  const base64 = typeof v.base64 === 'string' ? v.base64 : '';
  if (!dataUri || !base64 || base64.length > MAX_STATE_BYTES) return null;
  const originalBytes =
    typeof v.originalBytes === 'number' && Number.isFinite(v.originalBytes)
      ? Math.max(0, v.originalBytes)
      : base64.length;
  const width = typeof v.width === 'number' && Number.isFinite(v.width) ? Math.max(0, v.width) : 0;
  const height =
    typeof v.height === 'number' && Number.isFinite(v.height) ? Math.max(0, v.height) : 0;
  return {
    dataUri,
    base64,
    mimeType: sanitizeMimeType(v.mimeType),
    fileName: typeof v.fileName === 'string' ? v.fileName : 'image',
    originalBytes,
    width,
    height,
  };
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected Base64 image encoder state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    view: VALID_VIEWS.includes(v.view as ToolView) ? (v.view as ToolView) : DEFAULT_STATE.view,
    outputFormat: VALID_FORMATS.includes(v.outputFormat as OutputFormat)
      ? (v.outputFormat as OutputFormat)
      : DEFAULT_STATE.outputFormat,
    image: validImage(v.image),
    error: stringOrNull(v.error),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    if (!restored.success) return false;
    const a = state.image ?? null;
    const b = restored.data.image ?? null;
    const sameImage =
      (a === null && b === null) ||
      (a !== null &&
        b !== null &&
        a.dataUri === b.dataUri &&
        a.base64 === b.base64 &&
        a.mimeType === b.mimeType &&
        a.fileName === b.fileName &&
        a.originalBytes === b.originalBytes &&
        a.width === b.width &&
        a.height === b.height);
    return (
      restored.data.view === state.view &&
      restored.data.outputFormat === state.outputFormat &&
      sameImage
    );
  } catch {
    return false;
  }
}

/** Build a preview image for pasted Base64/data URI input; null on invalid input. */
export function decodeFromInput(
  input: string,
  originalBytes?: number
): { info: ImageInfo | null; error: string | null } {
  const normalized = normalizeBase64Input(input);
  if (!normalized.valid) {
    return { info: null, error: 'Invalid Base64 input: expected Base64 text or a data URI' };
  }
  const mimeType = normalized.mimeType || 'image/png';
  const dataUri = `data:${mimeType};base64,${normalized.base64}`;
  const info: ImageInfo = {
    dataUri,
    mimeType,
    base64: normalized.base64,
    fileName: `decoded.${mimeType.includes('svg') ? 'svg' : mimeType.split('/')[1]}`,
    originalBytes: originalBytes ?? normalized.base64.length,
    width: 0,
    height: 0,
  };
  return { info, error: null };
}

/** Encoded image info built from raw bytes and detected metadata. */
export function encodedImageInfo(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string,
  dimensions: { width: number; height: number }
): ImageInfo {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  return {
    dataUri: `data:${mimeType};base64,${base64}`,
    mimeType,
    base64,
    fileName,
    originalBytes: bytes.length,
    width: dimensions.width,
    height: dimensions.height,
  };
}

export const base64ImageEncoderTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { outputTexts, sizeComparison, summaryText };
