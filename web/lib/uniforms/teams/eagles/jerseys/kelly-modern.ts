// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar } from '../parts';

// Modern Kelly-green jersey: the current throwback construction uses the same body, sleeve and
// number treatment as the original, but restores the Eagles deep collar yoke.
export const JERSEY_KELLY_MODERN: UniformPart = {
  base: 'kelly',
  layers: [...collar('white')],
  number: { fill: 'white', outline: 'silver', outlineWidth: 14 },
};
