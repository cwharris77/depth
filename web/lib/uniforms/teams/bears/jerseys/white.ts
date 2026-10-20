import { BEARS_GSH_NAVY } from '../marks/labels';
import type { CompleteJerseySpec } from '../../core/complete';
import { BEARS_NUMBER_THREE } from '../marks/numbers';

// Navy-orange-navy sleeve stripes and navy numerals with a thin orange outline.
export const BEARS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'navy', outline: 'orange' },
  sleeveStripes: {
    bands: [
      { color: 'navy', size: 's' },
      { color: 'orange', size: 's' },
      { color: 'navy', size: 's' },
    ],
    gap: 'wide',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 175,
    fill: 'navy',
    outline: 'orange',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: BEARS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: BEARS_GSH_NAVY }],
};
