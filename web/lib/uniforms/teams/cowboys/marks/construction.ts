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
// for the right sleeve, centred on the sleeve stripe at the outer edge, which trims it to about
// half. The box is the sleeve anchor's span, so the star places unchanged.
export const COWBOYS_SLEEVE_STAR: Mark<'edge' | 'keyline' | 'star'> = {
  box: [490, 440, 564, 570],
  paths: [
    {
      slot: 'edge',
      d: 'M558.0,449.0 L567.0,476.6 L596.0,476.6 L572.5,493.7 L581.5,521.4 L558.0,504.3 L534.5,521.4 L543.5,493.7 L520.0,476.6 L549.0,476.6 Z',
    },
    {
      slot: 'keyline',
      d: 'M558.0,454.0 L565.9,478.2 L591.3,478.2 L570.7,493.1 L578.6,517.3 L558.0,502.4 L537.4,517.3 L545.3,493.1 L524.7,478.2 L550.1,478.2 Z',
    },
    {
      slot: 'star',
      d: 'M558.0,464.0 L563.6,481.3 L581.8,481.3 L567.1,492.0 L572.7,509.2 L558.0,498.6 L543.3,509.2 L548.9,492.0 L534.2,481.3 L552.4,481.3 Z',
    },
  ],
};
