import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_2026_SLEEVES } from '../marks/construction';

export const JERSEY_WHITE_2026: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'rounded', color: 'navy', trim: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'lightBlue2026', outline: 'red2026' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'lightBlue2026', outline: 'red2026', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: TITANS_2026_SLEEVES }],
};
