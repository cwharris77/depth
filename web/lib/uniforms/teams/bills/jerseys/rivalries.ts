import { expandJersey } from '../../core/jersey-spec';
import type { UniformPart } from '../../core/parts';

// Tone-on-tone: a white body with an unbanded white collar, kept legible by the shared keylines,
// and silver numerals outlined in navy on the chest and along both shoulders. No red anywhere.
export const JERSEY_RIVALRIES: UniformPart = expandJersey('bills-rivalries', {
  body: 'white',
  collar: { style: 'inset-v', color: 'white', inside: 'white', outline: true },
  shoulderNumber: { fill: 'rivalriesNumber', outline: 'navy' },
  number: { fill: 'rivalriesNumber', outline: 'navy', outlineWeight: 'regular' },
});
