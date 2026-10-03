import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_2018_SHOULDERS } from '../marks/construction';

export const JERSEY_BLUE_2025: CompleteJerseySpec = {
  body: 'lightBlue',
  collar: {
    style: 'inset-v',
    color: 'navy',
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
  number: { fill: 'navy', outline: 'white', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'under', mark: TITANS_2018_SHOULDERS }],
};
