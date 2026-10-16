import type { CompleteJerseySpec } from '../../core/complete';
import { ravensSleeveMarks } from '../marks/construction';
import { RAVENS_NUMBER_THREE } from '../marks/numbers';

// Black body with a body-coloured collar and grey keylines, white shoulder numerals with a gold outline, the shield above a purple band on each sleeve, white round numerals with a gold outline.
export const RAVENS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'gold' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 200,
    fill: 'white',
    outline: 'gold',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: RAVENS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [{ paint: 'over', mark: ravensSleeveMarks('purple') }],
};
