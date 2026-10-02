import type { CompleteJerseySpec } from '../../core/complete';

// White sleeve stripes, shoulder numerals and body numerals on the red body.
export const NINERS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: {
    style: 'inset-v',
    color: 'red',
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
      { color: 'white', size: 'm' },
      { color: 'white', size: 'm' },
    ],
    gap: 'broad',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'white', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
