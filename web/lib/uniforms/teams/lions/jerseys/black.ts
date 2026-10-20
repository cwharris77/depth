import { LIONS_BLACK_CHEST, LIONS_MOTOR_CITY } from '../marks/labels';
import type { CompleteJerseySpec } from '../../core/complete';
import { LIONS_NUMBER_THREE } from '../marks/numbers';
import { LIONS_BANDS_BLUE_SILVER } from '../marks/construction';

export const LIONS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'black',
    lining: 'none',
    backBar: 'blue',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'blue', outline: 'silver' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'blue',
    outline: 'silver',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: LIONS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: LIONS_BANDS_BLUE_SILVER },
    { paint: 'over', mark: LIONS_BLACK_CHEST },
    { paint: 'over', mark: LIONS_MOTOR_CITY },
  ],
};
