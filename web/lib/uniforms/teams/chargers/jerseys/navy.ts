import type { CompleteJerseySpec } from '../../core/complete';
import { chargersNavySleeveBolts } from '../marks/construction';

// A white sleeve bolt inside a navy gap and a narrow gold edge, and white numerals keylined gold.
export const CHARGERS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
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
  number: { fill: 'white', outline: 'gold', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: chargersNavySleeveBolts() }],
};
