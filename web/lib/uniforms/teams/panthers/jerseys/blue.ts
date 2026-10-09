import type { CompleteJerseySpec } from '../../core/complete';
import {
  panthersShoulderFan,
  panthersSleeveMarks,
  panthersShoulderNumbers,
} from '../marks/construction';

// Blue body, a white-outside-black shoulder fan and a black inset collar, with white numerals outlined in black.
export const PANTHERS_JERSEY_BLUE: CompleteJerseySpec = {
  body: 'blue',
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
  number: { fill: 'white', outline: 'black', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: panthersShoulderFan('white', 'black') },
    { paint: 'over', mark: panthersSleeveMarks('white') },
    { paint: 'over', mark: panthersShoulderNumbers('white', 'black') },
  ],
};
