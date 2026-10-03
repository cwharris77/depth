import type { CompleteJerseySpec } from '../../core/complete';

// Tone-on-tone: a white body with an unbanded white collar, kept legible by the shared keylines,
// and silver numerals outlined in navy on the chest and along both shoulders. No red anywhere.
export const BILLS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'white',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'rivalriesNumber', outline: 'navy' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'rivalriesNumber', outline: 'navy', outlineWeight: 'regular', texture: 'mesh' },
  marks: [],
};
