import type { CompleteJerseySpec } from '../../core/complete';

// Brown body with a five-band white-and-orange sleeve stack, a white shoulder numeral and plain
// white chest numerals. The V collar is body-coloured, so it needs the grey keyline to read.
export const BROWNS_JERSEY_BROWN: CompleteJerseySpec = {
  body: 'brown',
  collar: {
    style: 'inset-v',
    color: 'brown',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'white', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'white', size: 'm' },
    ],
    gap: 'none',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'brown', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
