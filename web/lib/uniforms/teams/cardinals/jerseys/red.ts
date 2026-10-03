import type { CompleteJerseySpec } from '../../core/complete';
import { CARDINALS_HOME_JERSEY_ART } from '../marks/jersey-art';

// Cardinal body with plain white chest numerals. The feathered collar, the ARIZONA chest wordmark,
// the collar-tab lettering and a white numeral along each shoulder top are drawn as art.
export const CARDINALS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'red', outlineWeight: 'none', texture: 'mesh' },
  marks: [{ paint: 'over', mark: CARDINALS_HOME_JERSEY_ART }],
};
