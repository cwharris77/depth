import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { seahawksShoulderNumbers } from '../marks/construction';
import { SEAHAWKS_THROWBACK_HAWK } from '../marks/throwback-hawk';

// Royal body with white numerals, white shoulder numbers, the original hawk on each sleeve and a
// white-green-white V collar: the inset V's white edge with a green inset.
export const SEAHAWKS_JERSEY_THROWBACK: CompleteJerseySpec = {
  body: 'throwbackRoyal',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'throwbackGreen',
    inside: 'throwbackNeck',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'throwbackRoyal', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [
    // Seattle's smaller shoulder numeral, not the spec's.
    { paint: 'over', mark: seahawksShoulderNumbers('white') },
    // The royal body disappears into the royal sleeve, so only the head, block and eye are drawn.
    anchoredMark({
      paint: 'over',
      mark: SEAHAWKS_THROWBACK_HAWK,
      anchor: 'sleeves',
      slots: { royal: null, white: 'white', block: 'throwbackGreen', eye: 'throwbackGreen' },
      id: 'sleeve-hawk',
    }),
  ],
};
