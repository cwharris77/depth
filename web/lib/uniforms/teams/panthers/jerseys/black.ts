import type { CompleteJerseySpec } from '../../core/complete';
import {
  panthersShoulderFan,
  panthersSleeveMarks,
  panthersShoulderNumbers,
} from '../marks/construction';

// Black body, a silver-outside-blue shoulder fan and a blue inset collar, with white numerals outlined in blue.
export const PANTHERS_JERSEY_BLACK: CompleteJerseySpec = {
  body: 'black',
  collar: {
    style: 'inset-v',
    color: 'blue',
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
  number: { fill: 'white', outline: 'blue', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: panthersShoulderFan('silver', 'blue') },
    { paint: 'over', mark: panthersSleeveMarks('white') },
    { paint: 'over', mark: panthersShoulderNumbers('white', 'blue') },
  ],
};
