import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { SAINTS_FLEUR } from '../marks/fleur';
import { SAINTS_NUMBER_THREE } from '../marks/numbers';

// Black body with a gold V collar band, gold shoulder numerals, gold numerals keylined white and
// the fleur on each sleeve.
export const SAINTS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'gold',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'gold', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'gold',
    outline: 'white',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: SAINTS_NUMBER_THREE,
  },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: SAINTS_FLEUR,
      anchor: 'sleeve-logos',
      slots: { outer: 'black', keyline: 'white', inner: 'black', face: 'gold' },
      id: 'black-sleeve-fleur',
    }),
  ],
};
