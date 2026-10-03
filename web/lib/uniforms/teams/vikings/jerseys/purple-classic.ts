import type { CompleteJerseySpec } from '../../core/complete';

export const VIKINGS_JERSEY_PURPLE_CLASSIC: CompleteJerseySpec = {
  body: 'purple',
  collar: {
    style: 'inset-v',
    color: 'purple',
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
      { color: 'white', size: 'm' },
      { color: 'gold', size: 's' },
      { color: 'white', size: 'm' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: { fill: 'white' },
  number: { fill: 'white', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
