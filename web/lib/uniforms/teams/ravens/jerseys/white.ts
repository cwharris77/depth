import type { CompleteJerseySpec } from '../../core/complete';
import { ravensSleeveMarks } from '../marks/construction';
import { RAVENS_NUMBER_THREE } from '../marks/numbers';

// White body with a body-coloured collar and grey keylines, purple shoulder numerals with a gold outline, the shield above a black band on each sleeve, purple round numerals with a gold outline.
export const RAVENS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'purple', outline: 'gold' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'purple',
    outline: 'gold',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: RAVENS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [{ paint: 'over', mark: ravensSleeveMarks('black') }],
};
