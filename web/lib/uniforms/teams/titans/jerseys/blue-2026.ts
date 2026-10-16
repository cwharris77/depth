import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_BLOCK_NUMBER_THREE } from '../marks/numbers';
import { TITANS_2026_SLEEVES } from '../marks/construction';

export const JERSEY_BLUE_2026: CompleteJerseySpec = {
  body: 'lightBlue2026',
  collar: { style: 'rounded', color: 'navy', trim: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'red2026' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'white',
    outline: 'red2026',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: TITANS_BLOCK_NUMBER_THREE,
  },
  marks: [{ paint: 'over', mark: TITANS_2026_SLEEVES }],
};
