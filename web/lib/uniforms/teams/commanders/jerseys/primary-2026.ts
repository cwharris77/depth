import type { CompleteJerseySpec } from '../../core/complete';
import { COMMANDERS_JERSEY_BURGUNDY } from './burgundy';

// Block numerals keylined gold on the chest and along the top of each shoulder, with two stripes at
// the sleeve hem.
export const COMMANDERS_JERSEY_BURGUNDY_2026: CompleteJerseySpec = {
  ...COMMANDERS_JERSEY_BURGUNDY,
  shoulderNumber: { fill: 'white', outline: 'gold' },
  sleeveNumber: 'none',
  sleeveStripes: {
    bands: [
      { color: 'white', size: 's' },
      { color: 'gold', size: 's' },
    ],
    gap: 'none',
    edge: 'none',
    position: 'hem',
  },
  number: { height: 195, fill: 'white', outline: 'gold', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
export const COMMANDERS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...COMMANDERS_JERSEY_BURGUNDY_2026,
  body: 'white',
  shoulderNumber: { fill: 'burgundy', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'burgundy', size: 's' },
      { color: 'gold', size: 's' },
    ],
    gap: 'none',
    edge: 'none',
    position: 'hem',
  },
  number: {
    height: 195,
    fill: 'burgundy',
    outline: 'gold',
    outlineWeight: 'thin',
    texture: 'mesh',
  },
};
