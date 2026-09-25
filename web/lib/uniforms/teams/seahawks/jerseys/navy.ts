import type { CompleteJerseySpec } from '../../core/complete';
import { seahawksModernCollar, seahawksModernShoulder } from '../marks/construction';

// The shoulder band, cap and numerals and the feathered collar are Seattle's own geometry, drawn by
// marks: the spec's shoulder and collar primitives have different shapes.
export const SEAHAWKS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'wolfGrey', outline: 'green', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: seahawksModernShoulder('wolfGrey', 'green') },
    { paint: 'over', mark: seahawksModernCollar('navy', 'navyNeck', 'green', 'navy') },
  ],
};
