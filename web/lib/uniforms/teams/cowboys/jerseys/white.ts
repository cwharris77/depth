// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';

// Away jersey: white body under navy sleeve caps, navy numerals.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [
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
  ],
  number: { fill: 'navy', outline: 'navy', outlineWidth: 10 },
};
