import type { CompleteJerseySpec } from '../../core/complete';
import { BROWNS_NUMBER_THREE } from '../marks/numbers';

// Brown body with a five-band white-and-orange sleeve stack, a white shoulder numeral and plain
// white chest numerals. The V collar is body-coloured, so it needs the grey keyline to read.
export const BROWNS_JERSEY_BROWN: CompleteJerseySpec = {
  body: 'brown',
  collar: {
    style: 'inset-v',
    color: 'brown',
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
      { color: 'orange', size: 'm' },
      { color: 'white', size: 'm' },
      { color: 'orange', size: 'm' },
      { color: 'white', size: 'm' },
    ],
    gap: 'none',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'white',
    outline: 'brown',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: BROWNS_NUMBER_THREE,
  },
  marks: [],
};
