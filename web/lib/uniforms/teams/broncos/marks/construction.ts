// Denver's own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written.
import {
  BRONCOS_CHEST_WORDMARK,
  BRONCOS_CRUSH_DECAL_D_PATH,
  BRONCOS_CRUSH_DECAL_KEYLINE_PATH,
  BRONCOS_DECAL_EYE_PATH,
  BRONCOS_DECAL_HORSE_PATH,
  BRONCOS_DECAL_MANE_PATH,
} from './paths';
import { placed, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The horse: orange mane under a white head. The eye is painted orange; the nostril is left
// shell-coloured so it reads through.
export const BRONCOS_HORSE_DECAL = placed([
  fill('broncos-decal-under', 'helmet', BRONCOS_DECAL_MANE_PATH, 'orange'),
  fill('broncos-decal-over', 'helmet', BRONCOS_DECAL_HORSE_PATH, 'white'),
  fill('broncos-decal-eye', 'helmet', BRONCOS_DECAL_EYE_PATH, 'orange'),
]);

// Orange Crush's "D": white keyline under the orange letter and charging horse.
export const BRONCOS_CRUSH_DECAL = placed([
  fill('broncos-decal-under', 'helmet', BRONCOS_CRUSH_DECAL_KEYLINE_PATH, 'white'),
  fill('broncos-decal-over', 'helmet', BRONCOS_CRUSH_DECAL_D_PATH, 'crushOrange'),
]);

// The chest wordmark between the collar point and the numerals.
export function broncosChestWordmark(jersey: string, color: string): PlacedMark {
  return placed([fill(`broncos-${jersey}-wordmark`, 'jersey', BRONCOS_CHEST_WORDMARK, color)]);
}
