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
// for the right sleeve so its lower points sit over the sleeve stripe. The box is the sleeve
// anchor's span, so the star places unchanged.
export const COWBOYS_SLEEVE_STAR: Mark<'edge' | 'keyline' | 'star'> = {
  box: [490, 440, 564, 570],
  paths: [
    {
      slot: 'edge',
      d: 'M527.0,439.0 L533.1,457.7 L552.7,457.7 L536.8,469.2 L542.9,487.8 L527.0,476.3 L511.1,487.8 L517.2,469.2 L501.3,457.7 L520.9,457.7 Z',
    },
    {
      slot: 'keyline',
      d: 'M527.0,442.5 L532.3,458.7 L549.3,458.7 L535.5,468.8 L540.8,485.0 L527.0,475.0 L513.2,485.0 L518.5,468.8 L504.7,458.7 L521.7,458.7 Z',
    },
    {
      slot: 'star',
      d: 'M527.0,449.5 L530.7,460.9 L542.7,460.9 L533.0,467.9 L536.7,479.3 L527.0,472.3 L517.3,479.3 L521.0,467.9 L511.3,460.9 L523.3,460.9 Z',
    },
  ],
};
