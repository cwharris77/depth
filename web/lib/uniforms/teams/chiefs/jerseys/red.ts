import type { CompleteJerseySpec } from '../../core/complete';
import { CHIEFS_NUMBER_THREE } from '../marks/numbers';

// White-gold-white sleeve bands, white shoulder numerals and white chest numerals, all ringed
// gold.
export const CHIEFS_JERSEY_RED: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'white', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 'm' },
      { color: 'gold', size: 's' },
      { color: 'white', size: 'm' },
    ],
    gap: 'none',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'white',
    outline: 'gold',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: CHIEFS_NUMBER_THREE,
  },
  marks: [],
};
