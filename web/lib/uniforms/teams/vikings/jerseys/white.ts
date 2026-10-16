import type { CompleteJerseySpec } from '../../core/complete';
import { VIKINGS_NUMBER_THREE } from '../marks/numbers';

export const VIKINGS_JERSEY_WHITE: CompleteJerseySpec = {
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
      { color: 'gold', size: 's' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 175,
    fill: 'purple',
    outline: 'white',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: VIKINGS_NUMBER_THREE,
  },
  marks: [],
};
