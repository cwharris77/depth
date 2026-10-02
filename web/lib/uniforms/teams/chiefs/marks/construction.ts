// Kansas City's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  CHIEFS_DECAL_CROSSBAR_PATH,
  CHIEFS_DECAL_C_PATH,
  CHIEFS_DECAL_FIELD_PATH,
  CHIEFS_DECAL_K_PATH,
  CHIEFS_DECAL_LETTER_KEYLINE_PATH,
  CHIEFS_DECAL_OUTLINE_PATH,
} from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

const decal = (id: string, d: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
});

// The arrowhead: black outline, white field, black letter keyline, and the K, C and crossbar
// knocked out in red.
export const CHIEFS_ARROWHEAD_DECAL = placed([
  decal('chiefs-decal-outline', CHIEFS_DECAL_OUTLINE_PATH, 'black'),
  decal('chiefs-decal-field', CHIEFS_DECAL_FIELD_PATH, 'white'),
  decal('chiefs-decal-letter-keyline', CHIEFS_DECAL_LETTER_KEYLINE_PATH, 'black'),
  ...[CHIEFS_DECAL_K_PATH, CHIEFS_DECAL_C_PATH, CHIEFS_DECAL_CROSSBAR_PATH].map((d, index) =>
    decal(`chiefs-decal-letter-red-${index + 1}`, d, 'red')
  ),
]);
