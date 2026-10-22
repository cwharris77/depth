import { BEARS_GSH_WHITE } from '../marks/labels';
import type { CompleteJerseySpec } from '../../core/complete';
import { BEARS_NUMBER_THREE } from '../marks/numbers';

// Orange collar, white-piped navy sleeve stripes and white numerals edged in navy.
export const BEARS_JERSEY_ORANGE: CompleteJerseySpec = {
  body: 'orange',
  collar: {
    style: 'inset-v',
    color: 'orange',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'navy' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
    edge: 'white',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 175,
    fill: 'white',
    outline: 'navy',
    outlineWeight: 'heavy',
    texture: 'plain',
    glyphPath: BEARS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: BEARS_GSH_WHITE }],
};
