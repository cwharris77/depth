import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { TEXANS_AWAY_SLEEVE_SWOOSH } from '../marks/construction';

export const TEXANS_JERSEY_WHITE: CompleteJerseySpec = {
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'white',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'navy', outline: 'red', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: TEXANS_AWAY_SLEEVE_SWOOSH,
      anchor: 'sleeves',
      slots: { navy: 'navy', red: 'red' },
      id: 'sleeve-swoosh',
    }),
  ],
};
