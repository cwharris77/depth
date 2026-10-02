import type { CompleteJerseySpec } from '../../core/complete';
import { bengalsSleeveTigers } from '../marks/construction';

// Black tiger sleeve caps, and black numerals keylined orange.
export const BENGALS_JERSEY_WHITE: CompleteJerseySpec = {
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
  number: { fill: 'black', outline: 'orange', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: bengalsSleeveTigers('black') }],
};
