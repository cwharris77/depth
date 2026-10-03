import type { CompleteJerseySpec } from '../../core/complete';

// Black body with a gold V collar filled gold inside, gold shoulder numerals, gold numerals keylined white.
export const SAINTS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'gold',
    trim: 'none',
    inside: 'gold',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'gold', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'gold', outline: 'white', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
