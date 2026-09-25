import type { CompleteJerseySpec } from '../../core/complete';
import { broncosChestWordmark } from '../marks/construction';

// A white-and-navy shoulder cap, and the chest wordmark in navy.
export const BRONCOS_JERSEY_ORANGE: CompleteJerseySpec = {
  body: 'orange',
  collar: {
    style: 'inset-v',
    color: 'orange',
    trim: 'none',
    inside: 'orangeNeck',
    lining: 'navy',
    backBar: 'navy',
    outline: true,
  },
  shoulderPanel: {
    bands: [
      { color: 'white', size: 'l' },
      { color: 'navy', size: 'm' },
    ],
  },
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'navy', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: broncosChestWordmark('orange', 'navy') }],
};
