import type { CompleteJerseySpec } from '../../core/complete';
import { ravensSleeveMarks } from '../marks/construction';

// White body with a body-coloured collar and grey keylines, a purple-faced gold shoulder bar and a black band on each sleeve, purple numerals with a gold outline.
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
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'purple', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: ravensSleeveMarks('purple', 'black') }],
};
