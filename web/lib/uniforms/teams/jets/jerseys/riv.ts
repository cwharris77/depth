import type { CompleteJerseySpec } from '../../core/complete';
import { jetsChestPatch, jetsSleevePanels } from '../marks/construction';
import { JETS_NUMBER_THREE } from '../marks/numbers';

// Rivalries: the filtered-green body with black sleeves, black and iron-ore stripes over each
// shoulder, an oval chest patch, and iron-ore numerals keylined in dark stucco.
export const JETS_JERSEY_RIV: CompleteJerseySpec = {
  body: 'gothamGreen',
  collar: {
    style: 'inset-v',
    color: 'gothamGreen',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: {
    bands: [
      { color: 'black', size: 'm' },
      { color: 'ironOre', size: 'm' },
    ],
    gap: 'none',
  },
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'ironOre' },
  number: {
    height: 190,
    fill: 'ironOre',
    outline: 'darkStucco',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: JETS_NUMBER_THREE,
  },
  marks: [
    { paint: 'under', mark: jetsSleevePanels('black') },
    { paint: 'over', mark: jetsChestPatch('ironOre', 'black') },
  ],
};
