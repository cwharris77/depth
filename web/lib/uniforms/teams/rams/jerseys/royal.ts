import type { CompleteJerseySpec } from '../../core/complete';
import { ramsCappedSleeveHorn } from '../marks/construction';
import { RAMS_NUMBER_THREE } from '../marks/numbers';

// Royal body with a body-coloured collar, yellow sleeve horns and fading yellow-to-white numerals.
export const RAMS_JERSEY_ROYAL: CompleteJerseySpec = {
  body: 'royal',
  collar: {
    style: 'inset-v',
    color: 'royal',
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
    fill: 'pattern:rams-number-fade',
    outline: 'yellow',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: RAMS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [{ paint: 'over', mark: ramsCappedSleeveHorn('yellow', 'yellow') }],
};
