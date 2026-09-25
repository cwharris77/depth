import type { CompleteJerseySpec } from '../../core/complete';
import { seahawksModernCollar, seahawksModernShoulder } from '../marks/construction';

// The home construction in Action Green: navy shoulder band, cap and shoulder numbers, navy collar
// feathers, a white wordmark in the band, and navy numerals with a white keyline.
// The shoulder band, cap and numerals and the feathered collar are Seattle's own geometry, drawn by
// marks: the spec's shoulder and collar primitives have different shapes.
export const SEAHAWKS_JERSEY_ACTION_GREEN: CompleteJerseySpec = {
  body: 'actionGreen',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'navy', outline: 'white', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    { paint: 'over', mark: seahawksModernShoulder('navy', 'navy') },
    {
      paint: 'over',
      mark: seahawksModernCollar('actionGreen', 'actionGreenNeck', 'navy', 'white'),
    },
  ],
};
