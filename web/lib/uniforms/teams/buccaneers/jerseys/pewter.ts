import { anchoredMark } from '../../core/jersey-spec';
import { BUCCANEERS_NUMBER_THREE } from '../marks/numbers';
import { buccaneersChestWordmark } from '../marks/wordmark';
import type { CompleteJerseySpec } from '../../core/complete';
import { BUCCANEERS_SHIP_COLORS } from '../marks/ship';
import { buccaneersCuff, BUCCANEERS_SLEEVE_SHIP } from '../marks/construction';

// Pewter body with a red collar and sleeve hem, and white numerals keylined in red.
export const BUCCANEERS_JERSEY_PEWTER: CompleteJerseySpec = {
  body: 'pewter',
  collar: {
    style: 'inset-v',
    color: 'red',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'red',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'red' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 195,
    fill: 'white',
    outline: 'red',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: BUCCANEERS_NUMBER_THREE,
  },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: BUCCANEERS_SLEEVE_SHIP,
      anchor: 'sleeves',
      slots: Object.fromEntries(Object.keys(BUCCANEERS_SHIP_COLORS).map((slot) => [slot, slot])),
      id: 'ship',
    }),
    { paint: 'over', mark: buccaneersChestWordmark('red') },
    { paint: 'over', mark: buccaneersCuff('red') },
  ],
};
