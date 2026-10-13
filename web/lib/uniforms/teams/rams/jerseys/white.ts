import type { CompleteJerseySpec } from '../../core/complete';
import { ramsCappedSleeveHorn } from '../marks/construction';
import { RAMS_NUMBER_ELEVEN } from '../marks/numbers';

// White body with a body-coloured collar, a split royal horn over each yellow outer sleeve and cuff, and flat royal numerals.
export const RAMS_JERSEY_WHITE: CompleteJerseySpec = {
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
  cuff: { color: 'yellow', size: 'm' },
  sleeveNumber: 'none',
  number: {
    fill: 'royal',
    outline: 'royal',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: RAMS_NUMBER_ELEVEN,
    glyphLabel: '11',
  },
  marks: [{ paint: 'under', mark: ramsCappedSleeveHorn('royal', 'yellow', 'panel') }],
};
