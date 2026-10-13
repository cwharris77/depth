// Dallas' own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written.
import { COWBOYS_DECAL_PATHS } from './decal';
import { placed } from '../../core/marks';
import type { Mark } from '../../core/marks';

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

// The sleeve star: a navy star inside a white keyline and a navy edge, drawn in mannequin space
// for the right sleeve, centred on the sleeve stripe at the outer edge, which trims it. The box is
// the sleeve anchor's span, so the star places unchanged.
export const COWBOYS_SLEEVE_STAR: Mark<'edge' | 'keyline' | 'star'> = {
  box: [490, 440, 564, 570],
  paths: [
    {
      slot: 'edge',
      d: 'M543.0,459.0 L549.7,479.7 L571.5,479.7 L553.9,492.5 L560.6,513.3 L543.0,500.5 L525.4,513.3 L532.1,492.5 L514.5,479.7 L536.3,479.7 Z',
    },
    {
      slot: 'keyline',
      d: 'M543.0,463.0 L548.8,481.0 L567.7,481.0 L552.4,492.1 L558.3,510.0 L543.0,498.9 L527.7,510.0 L533.6,492.1 L518.3,481.0 L537.2,481.0 Z',
    },
    {
      slot: 'star',
      d: 'M543.0,470.5 L547.2,483.3 L560.6,483.3 L549.7,491.2 L553.9,504.0 L543.0,496.1 L532.1,504.0 L536.3,491.2 L525.4,483.3 L538.8,483.3 Z',
    },
  ],
};
