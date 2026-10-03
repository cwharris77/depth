import type { CompleteJerseySpec } from '../../core/complete';

// Black body with a body-coloured collar and silver numerals; the TV number on each sleeve is
// silver too.
export const RAIDERS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'silver' },
  number: { fill: 'silver', outline: 'silver', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
