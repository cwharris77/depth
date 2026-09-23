// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { COLLAR_PATH } from '../parts';

// Home jersey: navy body, white/silver neck band, white-over-silver V-collar, white numerals.
export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [
    {
      id: 'cowboys-neck-band-outer',
      surface: 'jersey',
      d: COWBOYS_NECK_BAND_OUTER,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'cowboys-neck-band-core',
      surface: 'jersey',
      d: COWBOYS_NECK_BAND_CORE,
      clip: true,
      kind: 'fill',
      fill: 'silver',
    },
    {
      id: 'cowboys-collar-outer',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'white',
      strokeWidth: COWBOYS_COLLAR_OUTER_WIDTH,
    },
    {
      id: 'cowboys-collar-core',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'silver',
      strokeWidth: COWBOYS_COLLAR_CORE_WIDTH,
    },
  ],
  number: { fill: 'white', outline: 'white', outlineWidth: 10 },
};
