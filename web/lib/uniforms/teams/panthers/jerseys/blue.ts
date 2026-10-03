import type { CompleteJerseySpec } from '../../core/complete';
import { panthersCollar, panthersShoulderFan } from '../marks/construction';

// Blue body, a white-outside-black shoulder fan and a black collar V, with white numerals outlined in black.
export const PANTHERS_JERSEY_BLUE: CompleteJerseySpec = {
  body: 'blue',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'black', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: panthersShoulderFan('white', 'black') },
    { paint: 'over', mark: panthersCollar('black') },
  ],
};
