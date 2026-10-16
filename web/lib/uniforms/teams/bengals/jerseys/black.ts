import type { CompleteJerseySpec } from '../../core/complete';
import { BENGALS_NUMBER_THREE } from '../marks/numbers';
import { bengalsSleeveTigers } from '../marks/construction';

// Orange tiger sleeve caps, and white numerals keylined orange.
export const BENGALS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'black',
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
    height: 195,
    fill: 'white',
    outline: 'orange',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: BENGALS_NUMBER_THREE,
  },
  marks: [{ paint: 'under', mark: bengalsSleeveTigers('orange') }],
};
