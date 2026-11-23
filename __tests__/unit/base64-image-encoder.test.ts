import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  MAX_STATE_BYTES,
  detectMimeType,
  detectMimeFromDataUri,
  extForMime,
  formatBytes,
  normalizeBase64Input,
  outputTexts,
  sanitizeMimeType,
  sizeComparison,
  summaryText,
  type ImageInfo,
  type ToolState,
} from '@/tool/types';
import {
  base64ImageEncoderTool,
  decodeFromInput,
  deserializeState,
  encodedImageInfo,
  roundTrips,
  serializeState,
} from '@/tool/tool-definition';
import { isState } from '@/tool/ui-shared';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const sampleImage = (patch: Partial<ImageInfo> = {}): ImageInfo => ({
  dataUri: `data:image/png;base64,${PNG_BASE64}`,
  mimeType: 'image/png',
  base64: PNG_BASE64,
  fileName: 'pixel.png',
  originalBytes: 70,
  width: 1,
  height: 1,
  ...patch,
});

const state = (patch: Partial<ToolState> = {}): ToolState => ({
  ...DEFAULT_STATE,
  image: sampleImage(),
  ...patch,
});

describe('mime detection', () => {
  it('detects known extensions', () => {
    expect(detectMimeType('a.png')).toBe('image/png');
    expect(detectMimeType('a.JPG')).toBe('image/jpeg');
    expect(detectMimeType('a.svg')).toBe('image/svg+xml');
    expect(detectMimeType('no-extension')).toBe('application/octet-stream');
  });

  it('sanitizes arbitrary mime inputs', () => {
    expect(sanitizeMimeType('IMAGE/PNG extra')).toBe('image/png');
    expect(sanitizeMimeType(undefined)).toBe('image/png');
    expect(sanitizeMimeType('text/html')).toBe('image/png');
  });

  it('reads mime from a data uri prefix', () => {
    expect(detectMimeFromDataUri('data:image/webp;base64,AA==')).toBe('image/webp');
    expect(detectMimeFromDataUri('no-prefix')).toBe('');
  });

  it('maps mime types to file extensions', () => {
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/svg+xml')).toBe('svg');
    expect(extForMime('image/unknown-ish')).toBe('png');
  });
});

describe('base64 validation', () => {
  it('accepts raw base64 without a header', () => {
    const result = normalizeBase64Input(PNG_BASE64);
    expect(result.valid).toBe(true);
    expect(result.base64).toBe(PNG_BASE64);
    expect(result.mimeType).toBe('');
  });

  it('accepts full data uris and extracts the mime', () => {
    const uri = `data:image/gif;base64,${PNG_BASE64}`;
    const result = normalizeBase64Input(uri);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe('image/gif');
    expect(result.base64).toBe(PNG_BASE64);
  });

  it('handles url-safe base64 and whitespace', () => {
    const result = normalizeBase64Input(
      ` ${PNG_BASE64.replace(/\+/g, '-').replace(/\//g, '_')} \n`
    );
    expect(result.valid).toBe(true);
    expect(result.base64).toBe(PNG_BASE64);
  });

  it('rejects garbage input', () => {
    expect(normalizeBase64Input('').valid).toBe(false);
    expect(normalizeBase64Input('not base64!!').valid).toBe(false);
    expect(normalizeBase64Input('%%%%').valid).toBe(false);
    expect(normalizeBase64Input('AAA=extra-payload').valid).toBe(false);
  });
});

describe('size comparison and formatting', () => {
  it('computes base64 overhead vs the original binary', () => {
    const sizes = sizeComparison(100, 'A'.repeat(140));
    expect(sizes.originalBytes).toBe(100);
    expect(sizes.base64Bytes).toBe(140);
    expect(sizes.overheadPercent).toBeCloseTo(40);
  });

  it('handles zero-size originals', () => {
    expect(sizeComparison(0, 'AAAA').overheadPercent).toBe(0);
  });

  it('formats byte counts', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
    expect(formatBytes(-1)).toBe('—');
  });
});

describe('output rendering modes', () => {
  it('emits data uri, raw, css and html outputs', () => {
    const info = sampleImage({ width: 4, height: 2 });
    const texts = outputTexts(info);
    expect(texts.dataUri).toBe(info.dataUri);
    expect(texts.raw).toBe(info.base64);
    expect(texts.css).toBe(`background-image: url("${info.dataUri}");`);
    expect(texts.html).toContain(`<img src="${info.dataUri}"`);
    expect(texts.html).toContain('width="4"');
    expect(texts.html).toContain('height="2"');
  });
});

describe('decoding pasted base64', () => {
  it('builds a preview-able image from raw base64 without a header', () => {
    const result = decodeFromInput(PNG_BASE64);
    expect(result.error).toBeNull();
    expect(result.info?.dataUri).toBe(`data:image/png;base64,${PNG_BASE64}`);
    expect(result.info?.base64).toBe(PNG_BASE64);
  });

  it('normalizes url-safe base64 for display', () => {
    const urlSafe = PNG_BASE64.replace(/\+/g, '-').replace(/\//g, '_');
    const result = decodeFromInput(urlSafe);
    expect(result.info?.base64).toBe(PNG_BASE64);
  });

  it('returns an error for invalid base64 instead of crashing', () => {
    const result = decodeFromInput('!!!not base64@@@');
    expect(result.info).toBeNull();
    expect(result.error).toContain('Invalid Base64');
  });

  it('uses the mime from a pasted data uri', () => {
    const result = decodeFromInput(`data:image/webp;base64,${PNG_BASE64}`);
    expect(result.info?.mimeType).toBe('image/webp');
    expect(result.info?.dataUri.startsWith('data:image/webp;base64,')).toBe(true);
  });
});

describe('encoded image info', () => {
  it('base64-encodes bytes and records size/dimensions', () => {
    const bytes = new TextEncoder().encode(pngBytesText());
    const info = encodedImageInfo(bytes, 'image/png', 'sample.png', { width: 1, height: 1 });
    expect(info.mimeType).toBe('image/png');
    expect(info.fileName).toBe('sample.png');
    expect(info.originalBytes).toBe(bytes.length);
    expect(info.base64).toBe(btoa(pngBytesText()));
    expect(info.dataUri).toBe(`data:image/png;base64,${info.base64}`);
    expect(info.width).toBe(1);
    expect(info.height).toBe(1);
  });

  it('encodes payloads larger than one chunk (8 KiB boundary)', () => {
    const text = pngBytesText().repeat(1000);
    const bytes = new TextEncoder().encode(text);
    const info = encodedImageInfo(bytes, 'image/png', 'big.png', { width: 10, height: 10 });
    expect(info.base64).toBe(btoa(text));
    expect(info.base64.length).toBeGreaterThan(8192);
  });
});

function pngBytesText(): string {
  return 'PNGDATA-fixture-body';
}

describe('state serialization', () => {
  it('round-trips a full state through serialize/deserialize', () => {
    const full = state({ view: 'decode', outputFormat: 'css' });
    const restored = deserializeState(JSON.parse(serializeState(full)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(full);
    }
  });

  it('round-trips through the Tool object', () => {
    const full = state();
    const restored = base64ImageEncoderTool.deserialize(
      JSON.parse(base64ImageEncoderTool.serialize(full))
    );
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(full);
    }
  });

  it('keeps URL share state round-trip safe', () => {
    expect(roundTrips(state())).toBe(true);
    expect(roundTrips(DEFAULT_STATE)).toBe(true);
    expect(roundTrips(state({ outputFormat: 'html', image: null, error: 'boot' }))).toBe(true);
  });

  it('rejects malformed payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(undefined).success).toBe(false);
  });

  it('repairs invalid views and formats instead of failing', () => {
    const restored = deserializeState({ view: 'sideways', outputFormat: 42 });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.view).toBe(DEFAULT_STATE.view);
      expect(restored.data.outputFormat).toBe(DEFAULT_STATE.outputFormat);
      expect(restored.data.image).toBeNull();
    }
  });

  it('drops oversized or malformed image payloads', () => {
    const huge = deserializeState({
      image: { ...sampleImage(), base64: 'A'.repeat(MAX_STATE_BYTES + 1), dataUri: 'x' },
    });
    expect(huge.success).toBe(true);
    if (huge.success) {
      expect(huge.data.image).toBeNull();
    }
    const malformed = deserializeState({ image: { base64: '' } });
    expect(malformed.success).toBe(true);
    if (malformed.success) {
      expect(malformed.data.image).toBeNull();
    }
  });

  it('repairs non-numeric image fields with fallbacks', () => {
    const restored = deserializeState({
      image: {
        dataUri: 'data:image/png;base64,' + PNG_BASE64,
        base64: PNG_BASE64,
        mimeType: 'bogus',
        fileName: 42,
        originalBytes: 'nan',
        width: -5,
        height: null,
      },
    });
    expect(restored.success).toBe(true);
    if (restored.success && restored.data.image) {
      expect(restored.data.image.mimeType).toBe('image/png');
      expect(restored.data.image.fileName).toBe('image');
      expect(restored.data.image.originalBytes).toBe(PNG_BASE64.length);
      expect(restored.data.image.width).toBe(0);
      expect(restored.data.image.height).toBe(0);
    }
  });
});

describe('tool metadata', () => {
  it('exposes the configured identity', () => {
    expect(base64ImageEncoderTool.id).toBe('base64-image-encoder');
    expect(base64ImageEncoderTool.name).toBe('Base64 Image Encoder');
    expect(base64ImageEncoderTool.initialState).toEqual(DEFAULT_STATE);
  });
});

describe('summary text', () => {
  it('summarizes the loaded image', () => {
    const text = summaryText(state());
    expect(text).toContain('image/png');
    expect(text).toContain('original');
  });

  it('reports errors and the empty state', () => {
    expect(summaryText(state({ error: 'boom' }))).toBe('boom');
    expect(summaryText(DEFAULT_STATE)).toContain('Load an image');
  });
});

describe('isState guard', () => {
  it('accepts valid shapes and rejects the rest', () => {
    expect(isState(state())).toBe(true);
    expect(isState({})).toBe(false);
    expect(isState(null)).toBe(false);
    expect(isState('x')).toBe(false);
  });
});
