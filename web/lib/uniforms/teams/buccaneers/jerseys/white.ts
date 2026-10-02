import type { CompleteJerseySpec } from '../../core/complete';
import { buccaneersCollarKeyline, buccaneersCuff } from '../marks/construction';

// A pewter hem band and collar keyline, red shoulder numerals ringed pewter, and red numerals ringed pewter.
export const BUCCANEERS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'red', outline: 'pewter' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'red', outline: 'pewter', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: buccaneersCuff('pewter') },
    { paint: 'over', mark: buccaneersCollarKeyline('pewter') },
  ],
};
