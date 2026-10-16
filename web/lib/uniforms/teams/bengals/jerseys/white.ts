import type { CompleteJerseySpec } from '../../core/complete';
import { BENGALS_NUMBER_THREE } from '../marks/numbers';
import { bengalsSleeveTigers } from '../marks/construction';

// Black tiger sleeve caps, and black numerals keylined orange.
export const BENGALS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
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
    fill: 'black',
    outline: 'orange',
    outlineWeight: 'thin',
    texture: 'mesh',
    glyphPath: BENGALS_NUMBER_THREE,
  },
  marks: [{ paint: 'under', mark: bengalsSleeveTigers('black') }],
};
