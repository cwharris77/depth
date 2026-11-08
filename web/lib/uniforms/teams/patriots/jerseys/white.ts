import type { CompleteJerseySpec } from '../../core/complete';
import { PATRIOTS_NUMBER_THREE } from '../marks/numbers';
import { anchoredMark } from '../../core/jersey-spec';
import {
  PATRIOTS_SLEEVE_LOGO,
  patriotsChestWordmark,
  patriotsShoulderBands,
} from '../marks/construction';

// White body with a same-colour keylined V collar, red-navy-red shoulder bands, the helmet logo on
// each sleeve, a navy PATRIOTS chest wordmark and navy numerals outlined in red.
export const PATRIOTS_JERSEY_WHITE: CompleteJerseySpec = {
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
  number: {
    height: 185,
    fill: 'navy',
    outline: 'red',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: PATRIOTS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: patriotsShoulderBands('red', 'navy') },
    anchoredMark({
      paint: 'over',
      mark: PATRIOTS_SLEEVE_LOGO,
      anchor: 'sleeves',
      slots: { keyline: 'white', face: 'navy', streamers: 'red', silver: 'silver', star: 'white' },
      id: 'sleeve-logo',
    }),
    { paint: 'over', mark: patriotsChestWordmark('navy') },
  ],
};
