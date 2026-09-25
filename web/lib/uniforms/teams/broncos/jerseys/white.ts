import type { CompleteJerseySpec } from '../../core/complete';
import { broncosChestWordmark } from '../marks/construction';

// An orange-and-navy shoulder cap, and the chest wordmark in orange.
export const BRONCOS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'whiteNeck',
    lining: 'orange',
    backBar: 'orange',
    outline: true,
  },
  shoulderPanel: {
    bands: [
      { color: 'orange', size: 'l' },
      { color: 'navy', size: 'm' },
    ],
  },
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'navy', outline: 'orange', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: broncosChestWordmark('white', 'orange') }],
};
