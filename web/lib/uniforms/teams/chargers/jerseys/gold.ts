import type { CompleteJerseySpec } from '../../core/complete';
import { chargersSleeveBolts } from '../marks/construction';
import { CHARGERS_NUMBER_THREE } from '../marks/numbers';
import { CHARGERS_POWER_NECK_INSCRIPTION } from '../marks/neck-inscriptions';

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
  number: {
    height: 200,
    fill: 'white',
    outline: 'powderBlue',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: CHARGERS_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: chargersSleeveBolts('powderBlue', 'white') },
    { paint: 'over', mark: CHARGERS_POWER_NECK_INSCRIPTION },
  ],
};
