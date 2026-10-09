import type { CompleteJerseySpec } from '../../core/complete';

// The 1923 throwback's navy body: a navy narrow V collar with grey keylines, three thin bronze
// stripes on each sleeve and plain bronze numerals.
export const PACKERS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'narrow-v',
    color: 'navy',
    trim: 'none',
    trimEdge: 'none',
    inside: 'body',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: {
    bands: [
      { color: 'bronze', size: 's' },
      { color: 'bronze', size: 's' },
      { color: 'bronze', size: 's' },
    ],
    gap: 'wide',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'bronze', outline: 'bronze', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
