import type { CompleteJerseySpec } from '../../core/complete';
import { chargersSleeveBolts } from '../marks/construction';

// Powder-blue-keylined gold sleeve bolts, and powder-blue numerals keylined gold.
export const CHARGERS_JERSEY_WHITE: CompleteJerseySpec = {
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
  number: { fill: 'powderBlue', outline: 'gold', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: chargersSleeveBolts('powderBlue', 'gold') }],
};
