// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';

// Home jersey: royal body, no sleeve stripes, white numerals.
export const JERSEY_ROYAL: UniformPart = {
  base: 'royal',
  layers: [],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
