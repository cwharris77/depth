import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { LEAGUE_SHIELD } from '../../league/marks/shield';
import { LEAGUE_SWOOSH } from '../../league/marks/swoosh';
import { PACKERS_SHIELD_SLOTS } from '../marks/construction';

// Green body with an even gold, white and gold collar band, carried across the back of the neck,
// and a gold, white, gold sleeve set split by hairlines of green. Shoulder and chest numerals are
// white, with a white swoosh on each sleeve top and the league shield on the collar's point.
export const PACKERS_JERSEY_GREEN: CompleteJerseySpec = {
  body: 'green',
  collar: {
    style: 'inset-v',
    color: 'gold',
    trim: 'white',
    inside: 'body',
    lining: 'none',
    backBar: { color: 'gold', trim: 'white' },
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: {
    bands: [
      { color: 'gold', size: 'm' },
      { color: 'white', size: 's' },
      { color: 'gold', size: 'm' },
    ],
    gap: 'hairline',
    edge: 'none',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'white', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: LEAGUE_SWOOSH,
      anchor: 'sleeve-tops',
      slots: { body: 'white' },
      id: 'swoosh',
    }),
    anchoredMark({
      paint: 'over',
      mark: LEAGUE_SHIELD,
      anchor: 'collar-v',
      slots: PACKERS_SHIELD_SLOTS,
      id: 'shield',
    }),
  ],
};
