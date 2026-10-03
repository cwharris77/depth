import type { CompleteJerseySpec } from '../../core/complete';

// White body carrying the same five-band sleeve stack with brown in white's place, a brown
// shoulder numeral and plain brown chest numerals. The V collar is body-coloured, so it needs the
// grey keyline to read.
export const BROWNS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'brown', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'brown', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'brown', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'brown', size: 'm' },
    ],
    gap: 'none',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'brown', outline: 'white', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
