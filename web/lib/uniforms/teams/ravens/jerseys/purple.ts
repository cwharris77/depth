import type { CompleteJerseySpec } from '../../core/complete';
import { ravensSleeveMarks } from '../marks/construction';
import { RAVENS_NUMBER_THREE } from '../marks/numbers';

// Purple body with a body-coloured collar and grey keylines, white shoulder numerals with a gold outline, the shield above a black band on each sleeve, white round numerals with a gold outline.
export const RAVENS_JERSEY_PURPLE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'white', outline: 'gold' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'white',
    outline: 'gold',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: RAVENS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [{ paint: 'over', mark: ravensSleeveMarks('black') }],
};
