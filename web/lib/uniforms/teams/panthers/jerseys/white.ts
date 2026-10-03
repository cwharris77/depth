import type { CompleteJerseySpec } from '../../core/complete';
import { panthersCollar, panthersShoulderFan } from '../marks/construction';

// White body, a black-outside-blue shoulder fan and a black collar V, with black numerals outlined in blue.
export const PANTHERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'black', outline: 'blue', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: panthersShoulderFan('black', 'blue') },
    { paint: 'over', mark: panthersCollar('black') },
  ],
};
