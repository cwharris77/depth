// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';

// Home jersey (J1): teal body, no sleeve trim, white numerals keylined orange.
export const JERSEY_TEAL: UniformPart = {
  base: 'teal',
  layers: [],
  number: { fill: 'white', outline: 'orange', outlineWidth: 14 },
};
