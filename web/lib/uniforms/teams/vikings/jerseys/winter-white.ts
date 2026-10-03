import type { CompleteJerseySpec } from '../../core/complete';

export const VIKINGS_JERSEY_WINTER_WHITE: CompleteJerseySpec = {
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
  sleeveStripes: {
    bands: [
      { color: 'purple', size: 's' },
      { color: 'metallicGray', size: 's' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'purple', outline: 'white', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
