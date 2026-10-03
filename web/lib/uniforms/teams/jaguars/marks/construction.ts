// Jacksonville's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import { JAGUARS_DECAL_PATHS } from './decal';
import {
  JAGUARS_BAND_LEFT,
  JAGUARS_BAND_RIGHT,
  JAGUARS_COLLAR_ARC_LEFT,
  JAGUARS_COLLAR_ARC_RIGHT,
  JAGUARS_COLLAR_ARC_WIDTH,
  JAGUARS_TB_BLOCK_LEFT,
  JAGUARS_TB_BLOCK_RIGHT,
} from './paths';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

// The jaguar head in the supplied artwork's paint order, including its black keyline and gold
// shading. Each fill is its own palette key.
export const JAGUARS_HELMET_DECAL = placed(
  JAGUARS_DECAL_PATHS.map(({ d, fill }, index): PartLayer => ({
    id: `jaguars-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);

const band = (id: string, surface: 'sleeve-left' | 'sleeve-right', d: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: 'gold',
});

const arc = (id: string, d: string): PartLayer => ({
  id,
  surface: 'collar',
  d,
  clip: true,
  kind: 'stroke',
  stroke: 'gold',
  strokeWidth: JAGUARS_COLLAR_ARC_WIDTH,
});

// The black alternate's gold sleeve bands and neck arcs.
export const JAGUARS_BLACK_ALT_TRIM = placed([
  band('jaguars-band-left', 'sleeve-left', JAGUARS_BAND_LEFT),
  band('jaguars-band-right', 'sleeve-right', JAGUARS_BAND_RIGHT),
  arc('jaguars-collar-left', JAGUARS_COLLAR_ARC_LEFT),
  arc('jaguars-collar-right', JAGUARS_COLLAR_ARC_RIGHT),
]);

// The throwback's gold sleeve blocks.
export const JAGUARS_THROWBACK_BLOCKS = placed([
  band('jaguars-block-left', 'sleeve-left', JAGUARS_TB_BLOCK_LEFT),
  band('jaguars-block-right', 'sleeve-right', JAGUARS_TB_BLOCK_RIGHT),
]);
