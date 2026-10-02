import type { CompleteJerseySpec } from '../../core/complete';
import { chargersSleeveBolts } from '../marks/construction';

// Powder-blue-keylined white sleeve bolts, and white numerals keylined powder blue.
export const CHARGERS_JERSEY_GOLD: CompleteJerseySpec = {
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
  number: { fill: 'white', outline: 'powderBlue', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: chargersSleeveBolts('powderBlue', 'white') }],
};
