// Miami's own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written.
import {
  DOLPHINS_DECAL_DOLPHIN_PATH,
  DOLPHINS_DECAL_NAVY_PATH,
  DOLPHINS_DECAL_SUNBURST_PATH,
  DOLPHINS_SLASH_LEFT,
  DOLPHINS_SLASH_RIGHT,
  DOLPHINS_SLASH_WIDTH,
  DOLPHINS_SLEEVE_X_LEFT,
  DOLPHINS_SLEEVE_X_RIGHT,
  DOLPHINS_TB_DECAL_DOLPHIN_PATH,
  DOLPHINS_TB_DECAL_RING_PATH,
  DOLPHINS_TB_STRIPE_BOUNDS,
  DOLPHINS_WEDGE_LEFT,
  DOLPHINS_WEDGE_RIGHT,
} from './paths';
import { HELMET_CROWN_STRIPE_PATH } from '../../core/shared';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';

// The crown-hugging helmet stripe all four kits wear (shared geometry).
const crownStripe = (color: string): PartLayer => ({
  id: 'dolphins-crown-stripe',
  surface: 'helmet',
  d: HELMET_CROWN_STRIPE_PATH,
  clip: true,
  kind: 'fill',
  fill: color,
});

const decalLayer = (id: string, d: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
});

// Orange crown stripe and sunburst, the teal dolphin over it, and the navy shading on the dolphin.
export const DOLPHINS_SUNBURST_DECAL = placed([
  crownStripe('orange'),
  decalLayer('dolphins-decal-ring', DOLPHINS_DECAL_SUNBURST_PATH, 'orange'),
  decalLayer('dolphins-decal-dolphin', DOLPHINS_DECAL_DOLPHIN_PATH, 'teal'),
  decalLayer('dolphins-decal-navy', DOLPHINS_DECAL_NAVY_PATH, 'navy'),
]);

// Teal crown stripe and the teal dolphin breaking through a solid orange ring.
export const DOLPHINS_THROWBACK_DECAL = placed([
  crownStripe('teal'),
  decalLayer('dolphins-decal-ring', DOLPHINS_TB_DECAL_RING_PATH, 'orange'),
  decalLayer('dolphins-decal-dolphin', DOLPHINS_TB_DECAL_DOLPHIN_PATH, 'teal'),
]);

// The five-band sleeve set (white over orange), floating mid-sleeve rather than running to the
// hem.
const sleeveBands = (): PartLayer[] => {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', DOLPHINS_SLEEVE_X_LEFT],
    ['sleeve-right', DOLPHINS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < DOLPHINS_TB_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = DOLPHINS_TB_STRIPE_BOUNDS[i];
    const bottom = DOLPHINS_TB_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      out.push({
        id: `dolphins-sleeve-band-${i}-${surface === 'sleeve-left' ? 'left' : 'right'}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? 'white' : 'orange',
      });
    }
  }
  return out;
};
export const DOLPHINS_THROWBACK_SLEEVE_BANDS = placed(sleeveBands());

// A teal wedge on each sleeve cut by an orange slash.
export const DOLPHINS_RIVALRIES_TRIM = placed([
  {
    id: 'dolphins-wedge-left',
    surface: 'sleeve-left',
    d: DOLPHINS_WEDGE_LEFT,
    clip: true,
    kind: 'fill',
    fill: 'teal',
  },
  {
    id: 'dolphins-wedge-right',
    surface: 'sleeve-right',
    d: DOLPHINS_WEDGE_RIGHT,
    clip: true,
    kind: 'fill',
    fill: 'teal',
  },
  {
    id: 'dolphins-slash-left',
    surface: 'sleeve-left',
    d: DOLPHINS_SLASH_LEFT,
    clip: true,
    kind: 'stroke',
    stroke: 'orange',
    strokeWidth: DOLPHINS_SLASH_WIDTH,
  },
  {
    id: 'dolphins-slash-right',
    surface: 'sleeve-right',
    d: DOLPHINS_SLASH_RIGHT,
    clip: true,
    kind: 'stroke',
    stroke: 'orange',
    strokeWidth: DOLPHINS_SLASH_WIDTH,
  },
]);
