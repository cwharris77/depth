// Baltimore's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  RAVENS_DECAL_SVG_01_PATH,
  RAVENS_DECAL_SVG_02_PATH,
  RAVENS_DECAL_SVG_03_PATH,
  RAVENS_DECAL_SVG_04_PATH,
  RAVENS_DECAL_SVG_05_PATH,
  RAVENS_DECAL_SVG_06_PATH,
  RAVENS_DECAL_SVG_07_PATH,
  RAVENS_DECAL_SVG_08_PATH,
  RAVENS_DECAL_SVG_09_PATH,
  RAVENS_DECAL_SVG_10_PATH,
  RAVENS_DECAL_SVG_11_PATH,
  RAVENS_DECAL_SVG_12_PATH,
  RAVENS_DECAL_SVG_13_PATH,
  RAVENS_DECAL_SVG_14_PATH,
  RAVENS_DECAL_SVG_15_PATH,
  RAVENS_DECAL_SVG_16_PATH,
} from './decal';
import {
  RAVENS_SHOULDER_INNER_LEFT,
  RAVENS_SHOULDER_INNER_RIGHT,
  RAVENS_SHOULDER_OUTER_LEFT,
  RAVENS_SHOULDER_OUTER_RIGHT,
  RAVENS_SLEEVE_BAND_LEFT,
  RAVENS_SLEEVE_BAND_RIGHT,
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

// The raven head in the supplied SVG's paint order. Its gold eye-ring path (12) is red; the
// adjacent black pupil stays intact. Fixed art on the one shell.
export const RAVENS_HELMET_DECAL = placed([
  fill('ravens-decal-svg-01', 'helmet', RAVENS_DECAL_SVG_01_PATH, 'purple'),
  fill('ravens-decal-svg-02', 'helmet', RAVENS_DECAL_SVG_02_PATH, 'black'),
  fill('ravens-decal-svg-03', 'helmet', RAVENS_DECAL_SVG_03_PATH, 'decalGold'),
  fill('ravens-decal-svg-04', 'helmet', RAVENS_DECAL_SVG_04_PATH, 'white'),
  fill('ravens-decal-svg-05', 'helmet', RAVENS_DECAL_SVG_05_PATH, 'white'),
  fill('ravens-decal-svg-06', 'helmet', RAVENS_DECAL_SVG_06_PATH, 'decalGold'),
  fill('ravens-decal-svg-07', 'helmet', RAVENS_DECAL_SVG_07_PATH, 'decalGold'),
  fill('ravens-decal-svg-08', 'helmet', RAVENS_DECAL_SVG_08_PATH, 'purple'),
  fill('ravens-decal-svg-09', 'helmet', RAVENS_DECAL_SVG_09_PATH, 'white'),
  fill('ravens-decal-svg-10', 'helmet', RAVENS_DECAL_SVG_10_PATH, 'purple'),
  fill('ravens-decal-svg-11', 'helmet', RAVENS_DECAL_SVG_11_PATH, 'black'),
  fill('ravens-decal-svg-12', 'helmet', RAVENS_DECAL_SVG_12_PATH, 'red'),
  fill('ravens-decal-svg-13', 'helmet', RAVENS_DECAL_SVG_13_PATH, 'black'),
  fill('ravens-decal-svg-14', 'helmet', RAVENS_DECAL_SVG_14_PATH, 'black'),
  fill('ravens-decal-svg-15', 'helmet', RAVENS_DECAL_SVG_15_PATH, 'white'),
  fill('ravens-decal-svg-16', 'helmet', RAVENS_DECAL_SVG_16_PATH, 'purple'),
]);

// A gold keyline bar on each shoulder cap with its face over it, and a solid band at the sleeve
// hem.
export function ravensSleeveMarks(face: string, band: string): PlacedMark {
  return placed([
    fill('ravens-shoulder-outer-left', 'sleeve-left', RAVENS_SHOULDER_OUTER_LEFT, 'gold'),
    fill('ravens-shoulder-outer-right', 'sleeve-right', RAVENS_SHOULDER_OUTER_RIGHT, 'gold'),
    fill('ravens-shoulder-inner-left', 'sleeve-left', RAVENS_SHOULDER_INNER_LEFT, face),
    fill('ravens-shoulder-inner-right', 'sleeve-right', RAVENS_SHOULDER_INNER_RIGHT, face),
    fill('ravens-sleeve-band-left', 'sleeve-left', RAVENS_SLEEVE_BAND_LEFT, band),
    fill('ravens-sleeve-band-right', 'sleeve-right', RAVENS_SLEEVE_BAND_RIGHT, band),
  ]);
}
