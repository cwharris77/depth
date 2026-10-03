import type { CompleteJerseySpec } from '../../core/complete';
import { panthersCollar, panthersShoulderFan } from '../marks/construction';

// Black body, a silver-outside-blue shoulder fan and a blue collar V, with white numerals outlined in blue.
export const PANTHERS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'blue', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: panthersShoulderFan('silver', 'blue') },
    { paint: 'over', mark: panthersCollar('blue') },
  ],
};
