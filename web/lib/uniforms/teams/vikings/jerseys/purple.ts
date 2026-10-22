import { VIKINGS_HOME_WORDMARK } from '../marks/labels';
import type { CompleteJerseySpec } from '../../core/complete';
import { VIKINGS_NUMBER_THREE } from '../marks/numbers';

export const VIKINGS_JERSEY_PURPLE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 's' },
      { color: 'gold', size: 's' },
    ],
    gap: 'narrow',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 175,
    fill: 'white',
    outline: 'purple',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: VIKINGS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: VIKINGS_HOME_WORDMARK }],
};
