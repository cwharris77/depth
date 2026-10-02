import type { CompleteJerseySpec } from '../../core/complete';
import { bengalsSleeveTigers } from '../marks/construction';

// Black tiger sleeve caps, and white numerals keylined black.
export const BENGALS_JERSEY_ORANGE: CompleteJerseySpec = {
  body: 'orange',
  collar: {
    style: 'inset-v',
    color: 'orange',
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
  number: { fill: 'white', outline: 'black', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: bengalsSleeveTigers('black') }],
};
