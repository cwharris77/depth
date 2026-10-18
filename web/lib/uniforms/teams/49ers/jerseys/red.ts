import { NINERS_RED_CHEST } from '../marks/jersey-art';
import type { CompleteJerseySpec } from '../../core/complete';
import { NINERS_NUMBER_THREE } from '../marks/numbers';

// White sleeve stripes, shoulder numerals and body numerals on the red body.
export const NINERS_JERSEY_RED: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'white', size: 'm' },
      { color: 'white', size: 'm' },
      { color: 'white', size: 'm' },
    ],
    gap: 'broad',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'white',
    outline: 'white',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: NINERS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: NINERS_RED_CHEST }],
};
