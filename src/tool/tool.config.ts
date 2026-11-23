import type { ExportFormat } from '@itsjust/core';

export const toolConfig = {
  id: 'base64-image-encoder',
  name: 'Base64 Image Encoder',
  category: 'Converter',
  description:
    'Encode image files to Base64 data URIs and decode Base64 back to images entirely in the browser.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf', 'json'] satisfies ExportFormat[],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.15)',
    brand: 'Base64 Image Encoder',
    icon: '🖼️',
  },
  shortcuts: [
    {
      title: 'Base64 Image Encoder',
      shortcuts: [
        {
          keys: 'E',
          label: 'Encode view',
          description: 'switch to the encode view',
        },
        { keys: 'D', label: 'Decode view', description: 'switch to the decode view' },
        {
          keys: 'C',
          label: 'Copy output',
          description: 'copy the current output to the clipboard',
        },
      ],
    },
  ],
};

export default toolConfig;
