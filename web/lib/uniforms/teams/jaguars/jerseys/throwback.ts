import type { CompleteJerseySpec } from '../../core/complete';
import { JAGUARS_THROWBACK_NUMBER_THREE } from '../marks/numbers';
import {
  JAGUARS_THROWBACK_BLOCKS,
  JAGUARS_PROWLER_SLEEVES,
  JAGUARS_THROWBACK_CUFF,
  JAGUARS_THROWBACK_NUMBER_OUTLINE,
} from '../marks/construction';

export const JAGUARS_JERSEY_THROWBACK: CompleteJerseySpec = {
  body: 'teal',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'black',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'throwbackGold' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 190,
    fill: 'white',
    outline: 'throwbackGold',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: JAGUARS_THROWBACK_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: JAGUARS_THROWBACK_NUMBER_OUTLINE },
    { paint: 'over', mark: JAGUARS_PROWLER_SLEEVES },
    { paint: 'over', mark: JAGUARS_THROWBACK_CUFF },
    { paint: 'over', mark: JAGUARS_THROWBACK_BLOCKS },
  ],
};
