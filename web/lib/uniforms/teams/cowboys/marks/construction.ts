// Dallas' own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written.
import { COWBOYS_DECAL_PATHS } from './decal';
import { COWBOYS_SLEEVE_CAP_LEFT, COWBOYS_SLEEVE_CAP_RIGHT } from './paths';
import { placed } from '../../core/marks';

// The navy star with its white keyline, in the paint order of the source art.
export const COWBOYS_STAR_DECAL = placed(
  COWBOYS_DECAL_PATHS.map((layer, index) => ({
    id: `cowboys-decal-${index}`,
    surface: 'helmet' as const,
    d: layer.d,
    clip: true,
    kind: 'fill' as const,
    fill: layer.fill,
  }))
);

// Navy sleeve caps on both sleeves.
export const COWBOYS_SLEEVE_CAPS_NAVY = placed([
  {
    id: 'cowboys-sleeve-cap-left',
    surface: 'sleeve-left',
    d: COWBOYS_SLEEVE_CAP_LEFT,
    clip: true,
    kind: 'fill',
    fill: 'navy',
  },
  {
    id: 'cowboys-sleeve-cap-right',
    surface: 'sleeve-right',
    d: COWBOYS_SLEEVE_CAP_RIGHT,
    clip: true,
    kind: 'fill',
    fill: 'navy',
  },
]);
