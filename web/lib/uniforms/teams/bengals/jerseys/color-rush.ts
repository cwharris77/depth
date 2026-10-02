import type { CompleteJerseySpec } from '../../core/complete';
import { bengalsSleeveTigers } from '../marks/construction';

// All white with a black collar, black sleeve hems and shoulder numerals, black tiger sleeve caps,
// and plain black numerals.
export const BENGALS_JERSEY_COLOR_RUSH: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'black', outline: 'none' },
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 'm' },
  sleeveNumber: 'none',
  number: { fill: 'black', outline: 'black', outlineWeight: 'none', texture: 'mesh' },
  marks: [{ paint: 'under', mark: bengalsSleeveTigers('black') }],
};
