import type { CompleteJerseySpec } from '../../core/complete';
import { JAGUARS_THROWBACK_BLOCKS } from '../marks/construction';

// Teal body with a black V collar band and black back bar, white shoulder numerals, a gold block
// (drawn by the blocks mark) flush above a black hem band on each sleeve, and white numerals
// outlined in gold.
export const JAGUARS_JERSEY_THROWBACK: CompleteJerseySpec = {
  body: 'teal',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'black',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 'm' },
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'gold', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: JAGUARS_THROWBACK_BLOCKS }],
};
