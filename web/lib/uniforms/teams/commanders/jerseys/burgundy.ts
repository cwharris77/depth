import type { CompleteJerseySpec } from '../../core/complete';
import { COMMANDERS_SLEEVE_BAND_GOLD } from '../marks/construction';

// Burgundy body, a gold band around a white line on each sleeve, gold numerals keylined white. The burgundy V collar sits on the burgundy body, so grey keylines mark both edges.
export const COMMANDERS_JERSEY_BURGUNDY: CompleteJerseySpec = {
  body: 'burgundy',
  collar: {
    style: 'inset-v',
    color: 'burgundy',
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
  number: { fill: 'gold', outline: 'white', outlineWeight: 'regular', texture: 'mesh' },
  marks: [{ paint: 'over', mark: COMMANDERS_SLEEVE_BAND_GOLD }],
};
