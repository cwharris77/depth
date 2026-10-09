import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { NIKE_MARK } from '../../core/pants-logos';

// Green body with a narrow V collar whose gold, white and gold sides and back band are keylined
// apart, and a gold, white, gold sleeve set; both trims are split from the gold by hairlines of
// green. Shoulder and chest numerals are plain white, with a white swoosh on each sleeve top.
export const PACKERS_JERSEY_GREEN: CompleteJerseySpec = {
  body: 'green',
  collar: {
    style: 'narrow-v',
    color: 'gold',
    trim: 'white',
    trimEdge: 'green',
    inside: 'body',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'gold', size: 'm' },
      { color: 'white', size: 's' },
      { color: 'gold', size: 'm' },
    ],
    gap: 'hairline',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'white', outlineWeight: 'none', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: NIKE_MARK,
      anchor: 'sleeve-tops',
      slots: { nike: 'white' },
      id: 'swoosh',
    }),
  ],
};
