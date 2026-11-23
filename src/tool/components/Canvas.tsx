'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  detectMimeFromDataUri,
  formatBytes,
  outputTexts,
  sizeComparison,
  type OutputFormat,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
  /** Encode handler: receives the selected File. */
  onEncodeFile?: (file: File) => void;
  /** Decode handler: receives pasted Base64 or data URI text. */
  onDecodeInput?: (text: string) => void;
  /** Clears the current decode input text. */
  decodeInput: string;
  onDecodeInputChange?: (text: string) => void;
}

const OUTPUT_MODES: { value: OutputFormat; label: string }[] = [
  { value: 'dataUri', label: 'Data URI' },
  { value: 'raw', label: 'Raw Base64' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
];

function CopyButton({ value, testid, label }: { value: string; testid?: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      aria-label={label ?? 'Copy output'}
    >
      {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({
  state,
  onChange,
  onEncodeFile,
  onDecodeInput,
  decodeInput,
  onDecodeInputChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onEncodeFile?.(file);
    },
    [onEncodeFile]
  );

  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });

  const info = state.image;
  const sizes = info ? sizeComparison(info.originalBytes, info.base64) : null;
  const texts = info ? outputTexts(info) : null;
  const activeOutput = texts ? texts[state.outputFormat] : '';

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4" data-testid="tool-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Tool view"
        data-testid="view-tabs"
      >
        {(['encode', 'decode'] as const).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={state.view === view}
            data-testid={`view-tab-${view}`}
            onClick={() => update({ view })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize ${
              state.view === view
                ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {state.view === 'encode' ? (
        <div className="space-y-4" data-testid="encode-pane">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone"
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center ${
              dragging
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:bg-gray-900'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              🖼️
            </span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drag and drop an image here, or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPEG, GIF, WebP, SVG and more — everything stays in your browser
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="file-input"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {state.error ? (
            <p
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
              data-testid="error-banner"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}

          {info && sizes && texts ? (
            <div className="space-y-4" data-testid="encode-result">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={info.dataUri}
                  alt={`Encoded preview of ${info.fileName}`}
                  data-testid="preview-image"
                  className="max-h-64 max-w-full object-contain"
                />
                <p
                  className="text-xs text-gray-500 dark:text-gray-400"
                  data-testid="dimension-text"
                >
                  {info.fileName} — {info.width} × {info.height} px — {info.mimeType}
                </p>
              </div>

              <div
                className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs sm:grid-cols-3 dark:border-gray-800 dark:bg-gray-900/50"
                data-testid="size-comparison"
              >
                <div>
                  <span className="block text-gray-500 dark:text-gray-400">Original</span>
                  <span className="font-mono text-sm" data-testid="size-original">
                    {formatBytes(sizes.originalBytes)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-500 dark:text-gray-400">Base64</span>
                  <span className="font-mono text-sm" data-testid="size-base64">
                    {formatBytes(sizes.base64Bytes)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-500 dark:text-gray-400">Overhead</span>
                  <span className="font-mono text-sm" data-testid="size-overhead">
                    +{sizes.overheadPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <div
                  className="mb-2 flex flex-wrap gap-2"
                  role="tablist"
                  aria-label="Output format"
                  data-testid="output-tabs"
                >
                  {OUTPUT_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      role="tab"
                      aria-selected={state.outputFormat === mode.value}
                      data-testid={`output-tab-${mode.value}`}
                      onClick={() => update({ outputFormat: mode.value })}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                        state.outputFormat === mode.value
                          ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-stretch gap-2">
                  <textarea
                    readOnly
                    value={activeOutput}
                    data-testid="output-area"
                    className="h-32 w-full resize-none rounded-md border border-gray-300 bg-white p-2 font-mono text-xs break-all text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <CopyButton value={activeOutput} testid="copy-output" label="Copy output" />
                </div>
              </div>

              <div className="flex gap-2">
                <CopyButton value={texts.raw} testid="copy-raw-base64" label="Copy raw Base64" />
                <CopyButton value={texts.dataUri} testid="copy-data-uri" label="Copy data URI" />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4" data-testid="decode-pane">
          <div>
            <label
              htmlFor="decode-input"
              className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Paste Base64 or a data URI
            </label>
            <textarea
              id="decode-input"
              value={decodeInput}
              onChange={(e) => onDecodeInputChange?.(e.target.value)}
              data-testid="decode-input"
              placeholder="iVBORw0KGgo=… or data:image/png;base64,…"
              className="h-32 w-full resize-none rounded-md border border-gray-300 bg-white p-2 font-mono text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              type="button"
              data-testid="btn-decode"
              onClick={() => onDecodeInput?.(decodeInput)}
              className="mt-2 rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
            >
              Decode and preview
            </button>
          </div>

          {state.error ? (
            <p
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
              data-testid="error-banner"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}

          {state.view === 'decode' && info ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={info.dataUri}
                alt="Decoded image preview"
                data-testid="preview-image"
                className="max-h-64 max-w-full object-contain"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="dimension-text">
                {info.width} × {info.height} px — {detectMimeFromDataUri(info.dataUri)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
