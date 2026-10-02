import type { CompleteJerseySpec } from '../../core/complete';
import { buccaneersCollarKeyline, buccaneersCuff } from '../marks/construction';

// A pewter hem band and collar keyline, white shoulder numerals ringed pewter, and white numerals ringed orange.
export const BUCCANEERS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'pewter' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'orange', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: buccaneersCuff('pewter') },
    { paint: 'over', mark: buccaneersCollarKeyline('pewter') },
  ],
};
