import type { CompleteJerseySpec } from '../../core/complete';
import {
  panthersShoulderFan,
  panthersSleeveMarks,
  panthersShoulderNumbers,
} from '../marks/construction';

// White body, a black-outside-blue shoulder fan and a black inset collar, with black numerals outlined in blue.
export const PANTHERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
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
  number: { fill: 'black', outline: 'blue', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: panthersShoulderFan('black', 'blue') },
    { paint: 'over', mark: panthersSleeveMarks('black') },
    { paint: 'over', mark: panthersShoulderNumbers('black', 'blue') },
  ],
};
