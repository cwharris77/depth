import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_RIVALRIES_JERSEY_ART } from '../marks/jersey-art';

// Speckled cream body with a dark feather patch on each sleeve and red numerals offset in orange.
// The feathered collar carries rays at the neck; all of it is drawn as art.
export const CARDINALS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'cream',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'rivalRed', outline: 'rivalOrange', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'over', mark: CARDINALS_RIVALRIES_JERSEY_ART }],
};
