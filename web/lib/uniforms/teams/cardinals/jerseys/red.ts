import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_NUMBER_THREE } from '../marks/numbers';
import { CARDINALS_HOME_JERSEY_ART } from '../marks/jersey-art';

// Cardinal body with white chest and shoulder numerals and an ARIZONA chest wordmark.
export const CARDINALS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: {
    style: 'inset-v',
    color: 'red',
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
    height: 175,
    fill: 'white',
    outline: 'red',
    outlineWeight: 'none',
    texture: 'mesh',
    glyphPath: CARDINALS_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: CARDINALS_HOME_JERSEY_ART }],
};
