import { DEFAULT_STATE, type ToolState } from './types';

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.view === 'string' &&
    typeof v.outputFormat === 'string' &&
    'image' in v &&
    DEFAULT_STATE !== undefined
  );
}

export { DEFAULT_STATE };
