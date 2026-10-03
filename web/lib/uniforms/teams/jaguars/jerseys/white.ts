import type { CompleteJerseySpec } from '../../core/complete';

// White body with a black V collar band keylined grey, a white back bar, black shoulder numerals,
// a black sleeve hem band and plain black numerals.
export const JAGUARS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'black',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'white',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'black', outline: 'none' },
  sleeveStripes: 'none',
  cuff: { color: 'black', size: 'l' },
  sleeveNumber: 'none',
  number: { fill: 'black', outline: 'white', outlineWeight: 'none', texture: 'mesh' },
  marks: [],
};
