import type { CompleteJerseySpec } from '../../core/complete';
import { buccaneersCreamCuff } from '../marks/construction';

// A red, white, red three-band cuff with no collar trim, and white numerals
// ringed crimson.
export const BUCCANEERS_JERSEY_CREAMSICLE: CompleteJerseySpec = {
  body: 'creamOrange',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'crimson', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: buccaneersCreamCuff('crimson', 'white') }],
};
