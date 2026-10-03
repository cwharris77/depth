// New Orleans' fleur-de-lis decal, bound to palette keys and emitted exactly as written.
import {
  SAINTS_DECAL_BLACK_OUTER_PATH,
  SAINTS_DECAL_GOLD_PATH,
  SAINTS_DECAL_WHITE_PATH,
} from './decal';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

const fill = (id: string, d: string, color: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The fleur's three paint layers in the source's paint order, worn on the one gold shell.
export const SAINTS_FLEUR_DECAL = placed([
  fill('saints-decal-black', SAINTS_DECAL_BLACK_OUTER_PATH, 'decal-black'),
  fill('saints-decal-gold', SAINTS_DECAL_GOLD_PATH, 'decal-gold'),
  fill('saints-decal-white', SAINTS_DECAL_WHITE_PATH, 'decal-white'),
]);
