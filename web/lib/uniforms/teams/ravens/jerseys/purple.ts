import type { CompleteJerseySpec } from '../../core/complete';
import { ravensSleeveMarks } from '../marks/construction';

// Purple body with a body-coloured collar and grey keylines, a white-faced gold shoulder bar and a black band on each sleeve, white numerals with a gold outline.
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
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: ravensSleeveMarks('white', 'black') }],
};
