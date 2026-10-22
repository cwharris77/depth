import type { CompleteJerseySpec } from '../../core/complete';
import { LIONS_NUMBER_THREE } from '../marks/numbers';

export const LIONS_JERSEY_CLASSIC: CompleteJerseySpec = {
  body: 'blue',
  collar: {
    style: 'inset-v',
    color: 'blue',
    trim: 'none',
    inside: 'blue',
    lining: 'none',
    backBar: 'blue',
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
    fill: 'silver',
    outline: 'silver',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: LIONS_NUMBER_THREE,
  },
  marks: [],
};
