// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';

// Away jersey (J2): white body, no sleeve trim, teal numerals keylined orange.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [],
  number: { fill: 'teal', outline: 'orange', outlineWidth: 14 },
};
