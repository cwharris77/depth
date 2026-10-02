import type { CompleteJerseySpec } from '../../core/complete';
import { chargersSleeveBolts } from '../marks/construction';

// White-keylined gold sleeve bolts, and white numerals keylined gold.
export const CHARGERS_JERSEY_POWDER: CompleteJerseySpec = {
  body: 'powderBlue',
  collar: {
    style: 'inset-v',
    color: 'powderBlue',
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
  marks: [{ paint: 'under', mark: chargersSleeveBolts('white', 'gold') }],
};
