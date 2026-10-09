import { anchoredMark } from '../../core/jersey-spec';
import { NIKE_MARK } from '../../core/pants-logos';
import type { CompleteJerseySpec } from '../../core/complete';
import { BUCCANEERS_SHIP_COLORS } from '../marks/ship';
import { buccaneersCuff, BUCCANEERS_SLEEVE_SHIP } from '../marks/construction';

export const BUCCANEERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'pewter',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'red', outline: 'pewter' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'red', outline: 'pewter', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: NIKE_MARK,
      anchor: 'sleeve-tops',
      slots: { nike: 'red' },
      id: 'swoosh',
    }),
    anchoredMark({
      paint: 'over',
      mark: BUCCANEERS_SLEEVE_SHIP,
      anchor: 'sleeves',
      slots: Object.fromEntries(Object.keys(BUCCANEERS_SHIP_COLORS).map((slot) => [slot, slot])),
      id: 'ship',
    }),
    { paint: 'over', mark: buccaneersCuff('pewter') },
  ],
};
