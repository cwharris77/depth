import type { CompleteJerseySpec } from '../../core/complete';

// White body with a body-coloured collar and black numerals edged in silver; the TV number on
// each sleeve is black.
export const RAIDERS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'black' },
  number: { fill: 'black', outline: 'silver', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
