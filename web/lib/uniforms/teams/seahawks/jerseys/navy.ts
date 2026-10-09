import { seahawksSleeveNike } from '../marks/equipment';
import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { seahawksModernCollar } from '../marks/construction';
import { SEAHAWKS_SHOULDER, SEAHAWKS_SHOULDER_WORDMARK } from '../marks/shoulder';

// The shoulder band, cap and numerals are Seattle's own shapes placed by the shoulder anchors; the
// feathered trim overlays the shared collar geometry.
export const SEAHAWKS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'jerseyNavy',
  collar: { style: 'none' },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'wolfGrey', outline: 'green', outlineWeight: 'x-heavy', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: SEAHAWKS_SHOULDER,
      anchor: 'shoulders',
      slots: { number: 'wolfGrey', band: 'wolfGrey', cap: 'green' },
      id: 'shoulder',
    }),
    { paint: 'over', mark: seahawksModernCollar('jerseyNavy', 'navyNeck', 'green') },
    anchoredMark({
      paint: 'over',
      mark: SEAHAWKS_SHOULDER_WORDMARK,
      anchor: 'shoulder-right',
      slots: { wordmark: 'navy' },
      id: 'shoulder',
    }),
    { paint: 'over', mark: seahawksSleeveNike('navy') },
  ],
};
