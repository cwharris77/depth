import type { CompleteJerseySpec } from '../../core/complete';

// The 1923 throwback's navy body: a navy collar with grey keylines, three thin bronze stripes on
// each sleeve and bronze numerals.
export const PACKERS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
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
  number: { fill: 'bronze', outline: 'bronze', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [],
};
