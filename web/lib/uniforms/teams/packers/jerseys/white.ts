import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { NIKE_MARK } from '../../core/pants-logos';

// White body (away and Winter Warning) with a green narrow V collar carrying a gold trim, a green,
// gold, green sleeve set and a green swoosh on each sleeve top. Shoulder and chest numerals are
// plain green.
export const PACKERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'narrow-v',
    color: 'green',
    trim: 'gold',
    trimEdge: 'none',
    inside: 'body',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'green', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'green', size: 'm' },
      { color: 'gold', size: 'm' },
      { color: 'green', size: 'm' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'green', outline: 'green', outlineWeight: 'none', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: NIKE_MARK,
      anchor: 'sleeve-tops',
      slots: { nike: 'green' },
      id: 'swoosh',
    }),
  ],
};
