import type { CompleteJerseySpec } from '../../core/complete';
import { LIONS_BANDS_SILVER } from '../marks/construction';

// Blue body with a blue V collar keylined grey, white shoulder numerals, a silver and white
// four-band set on each sleeve (drawn by the bands mark) and white numerals outlined silver.
export const LIONS_JERSEY_BLUE: CompleteJerseySpec = {
  body: 'blue',
  collar: {
    style: 'inset-v',
    color: 'blue',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'blue',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'silver', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: LIONS_BANDS_SILVER }],
};
