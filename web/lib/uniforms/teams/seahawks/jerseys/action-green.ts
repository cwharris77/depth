import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { seahawksModernCollar } from '../marks/construction';
import { SEAHAWKS_SHOULDER, SEAHAWKS_SHOULDER_WORDMARK } from '../marks/shoulder';

// The home construction in Action Green: navy shoulder band, cap and shoulder numbers, navy collar
// feathers, a white wordmark in the band, and navy numerals with a white keyline.
// The shoulder band, cap and numerals are Seattle's own shapes placed by the shoulder anchors; the
// feathered collar is Seattle's own geometry. The spec's shoulder and collar primitives have
// different shapes.
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
    anchoredMark({
      paint: 'over',
      mark: SEAHAWKS_SHOULDER,
      anchor: 'shoulders',
      slots: { number: 'navy', band: 'navy', cap: 'navy' },
      id: 'shoulder',
    }),
    { paint: 'over', mark: seahawksModernCollar('actionGreen', 'actionGreenNeck', 'navy') },
    anchoredMark({
      paint: 'over',
      mark: SEAHAWKS_SHOULDER_WORDMARK,
      anchor: 'shoulder-right',
      slots: { wordmark: 'white' },
      id: 'shoulder',
    }),
  ],
};
