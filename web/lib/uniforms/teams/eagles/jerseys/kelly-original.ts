import { LEGACY_ROUNDED_COLLAR_PATH } from '../../core/shared';
// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { collar } from '../parts';

// Original Kelly-green jersey (J2): kelly body, NO cuff, white collar, white numerals keylined
// silver. The 1987 construction keeps its rounded collar instead of the modern deep yoke.
export const JERSEY_KELLY_ORIGINAL: UniformPart = {
  base: 'kelly',
  layers: [...collar('white', LEGACY_ROUNDED_COLLAR_PATH)],
  number: { fill: 'white', outline: 'silver', outlineWidth: 14 },
};
