import type { CompleteJerseySpec } from '../../core/complete';
import { TITANS_2018_NUMBER_THREE } from '../marks/numbers';
import { TITANS_2018_SHOULDERS } from '../marks/construction';

export const JERSEY_NAVY_ALT: CompleteJerseySpec = {
  body: 'navy',
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
  number: {
    height: 190,
    fill: 'white',
    outline: 'lightBlue',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: TITANS_2018_NUMBER_THREE,
  },
  marks: [{ paint: 'under', mark: TITANS_2018_SHOULDERS }],
};
