import type { CompleteJerseySpec } from '../../core/complete';
import { BRONCOS_NUMBER_THREE } from '../marks/numbers';
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
  number: {
    height: 175,
    fill: 'navy',
    outline: 'orange',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: BRONCOS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: broncosChestWordmark('white', 'orange') }],
};
