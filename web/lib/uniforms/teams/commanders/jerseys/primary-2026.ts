import type { CompleteJerseySpec } from '../../core/complete';
import { COMMANDERS_JERSEY_BURGUNDY } from './burgundy';

// Block numerals keylined gold on the chest and each sleeve, above two stripes at the hem.
export const COMMANDERS_JERSEY_BURGUNDY_2026: CompleteJerseySpec = {
  ...COMMANDERS_JERSEY_BURGUNDY,
  sleeveNumber: { fill: 'white', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 's' },
      { color: 'gold', size: 's' },
    ],
    gap: 'none',
    edge: 'none',
    position: 'hem',
  },
  number: { fill: 'white', outline: 'gold', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
export const COMMANDERS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...COMMANDERS_JERSEY_BURGUNDY_2026,
  body: 'white',
  sleeveNumber: { fill: 'burgundy', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'burgundy', size: 's' },
      { color: 'gold', size: 's' },
    ],
    gap: 'none',
    edge: 'none',
    position: 'hem',
  },
  number: { fill: 'burgundy', outline: 'gold', outlineWeight: 'thin', texture: 'mesh' },
};
