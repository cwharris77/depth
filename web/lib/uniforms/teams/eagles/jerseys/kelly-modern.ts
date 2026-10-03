import type { CompleteJerseySpec } from '../../core/complete';

// Kelly-green body with a body-coloured keylined V collar and no sleeve band; white numerals
// keylined black, the same on the shoulders.
export const EAGLES_JERSEY_KELLY_MODERN: CompleteJerseySpec = {
  body: 'kelly',
  collar: {
    style: 'inset-v',
    color: 'kelly',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'black' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'black', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
