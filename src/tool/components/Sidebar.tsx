'use client';

import React from 'react';
import { formatBytes, summaryText, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onCopyOutput?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onCopyOutput }) => {
  const info = state.image;
  const bytes = info ? info.base64.length : 0;
  return (
    <div className="h-full space-y-6 overflow-y-auto p-4 text-sm" data-testid="tool-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">How it works</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>• Encode: drop or pick an image to get a data URI</li>
          <li>• Output modes: data URI, raw Base64, CSS and HTML snippets</li>
          <li>• Decode: paste Base64 or a data URI to preview the image</li>
          <li>• Everything runs locally — no uploads, ever</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Current image</h3>
        {info ? (
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
            <li data-testid="sidebar-file-name">{info.fileName}</li>
            <li data-testid="sidebar-dimensions">
              {info.width} × {info.height} px
            </li>
            <li data-testid="sidebar-mime">{info.mimeType}</li>
            <li data-testid="sidebar-original-size">Original: {formatBytes(info.originalBytes)}</li>
            <li data-testid="sidebar-base64-size">Base64: {formatBytes(bytes)}</li>
          </ul>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="sidebar-empty">
            No image loaded yet.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>E</kbd> — encode view
          </li>
          <li>
            <kbd>D</kbd> — decode view
          </li>
          <li>
            <kbd>C</kbd> — copy output
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Summary</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-summary">
          {summaryText(state)}
        </p>
        {onCopyOutput ? (
          <button
            type="button"
            onClick={onCopyOutput}
            data-testid="sidebar-copy-output"
            className="mt-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Copy output
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current image; open it to
          restore this conversion.
        </p>
      </div>
    </div>
  );
};
