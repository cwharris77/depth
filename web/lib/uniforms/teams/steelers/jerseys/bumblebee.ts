import type { CompleteJerseySpec } from '../../core/complete';
import { STEELERS_BUMBLEBEE_PANEL } from '../marks/construction';

// Gold body with a gold V collar and grey keylines under the black chevron and pinstriped panel, white numerals outlined black.
export const STEELERS_JERSEY_BUMBLEBEE: CompleteJerseySpec = {
  body: 'gold',
  collar: {
    style: 'inset-v',
    color: 'gold',
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
  number: { fill: 'white', outline: 'black', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [{ paint: 'under', mark: STEELERS_BUMBLEBEE_PANEL }],
};
