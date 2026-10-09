import { anchoredMark } from '../../core/jersey-spec';
import type { CompleteJerseySpec } from '../../core/complete';
import { BUCCANEERS_SHIP_COLORS } from '../marks/ship';
import { buccaneersCuff, BUCCANEERS_SLEEVE_SHIP } from '../marks/construction';

export const BUCCANEERS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: {
    style: 'inset-v',
    color: 'red',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'pewter',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'pewter' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'orange', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
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
