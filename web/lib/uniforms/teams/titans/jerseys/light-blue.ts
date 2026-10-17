import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_BLOCK_NUMBER_THREE } from '../marks/numbers';

export const JERSEY_LIGHT_BLUE: CompleteJerseySpec = {
  body: 'lightBlue',
  collar: { style: 'rounded', color: 'lightBlue', trim: 'white' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: { fill: 'white', outline: 'red' },
  number: {
    height: 190,
    fill: 'white',
    outline: 'red',
    outlineWeight: 'regular',
    texture: 'plain',
    glyphPath: TITANS_BLOCK_NUMBER_THREE,
  },
  marks: [],
};
