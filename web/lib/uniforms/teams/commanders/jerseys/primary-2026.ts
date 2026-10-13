import type { CompleteJerseySpec } from '../../core/complete';
import { COMMANDERS_JERSEY_BURGUNDY } from './burgundy';

export const COMMANDERS_JERSEY_BURGUNDY_2026: CompleteJerseySpec = {
  ...COMMANDERS_JERSEY_BURGUNDY,
  shoulderNumber: { fill: 'white', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 'm' },
      { color: 'gold', size: 'm' },
    ],
    gap: 'hairline',
    edge: 'none',
  },
  number: { fill: 'white', outline: 'gold', outlineWeight: 'thin', texture: 'mesh' },
  marks: [],
};
export const COMMANDERS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...COMMANDERS_JERSEY_BURGUNDY_2026,
  body: 'white',
  shoulderNumber: { fill: 'burgundy', outline: 'gold' },
  sleeveStripes: {
    bands: [
      { color: 'burgundy', size: 'm' },
      { color: 'gold', size: 'm' },
    ],
    gap: 'hairline',
    edge: 'none',
  },
  number: { fill: 'burgundy', outline: 'gold', outlineWeight: 'thin', texture: 'mesh' },
};
