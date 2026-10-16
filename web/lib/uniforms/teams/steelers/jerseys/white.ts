import type { CompleteJerseySpec } from '../../core/complete';
import { STEELERS_SLEEVE_STRIPES } from '../marks/construction';
import { STEELERS_NUMBER_THREE } from '../marks/numbers';

// White body with a body-coloured V collar and grey keylines, black shoulder numerals, the gold and black sleeve stripe set and plain black numerals.
export const STEELERS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'black', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 175,
    fill: 'black',
    outline: 'white',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: STEELERS_NUMBER_THREE,
  },
  marks: [{ paint: 'under', mark: STEELERS_SLEEVE_STRIPES }],
};
