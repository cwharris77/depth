import type { CompleteJerseySpec } from '../../core/complete';
import { falconsSideStripes } from '../marks/construction';

// White body with a white V collar keylined grey, black shoulder numerals edged red, red side piping, and black numerals keylined red.
export const FALCONS_JERSEY_WHITE: CompleteJerseySpec = {
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
  shoulderNumber: { fill: 'black', outline: 'red' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'black', outline: 'red', outlineWeight: 'thin', texture: 'mesh' },
  marks: [{ paint: 'under', mark: falconsSideStripes('red') }],
};
