import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { TEXANS_HOME_SLEEVE_HORN } from '../marks/construction';

export const TEXANS_JERSEY_NAVY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'red',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'none' },
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'red', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: TEXANS_HOME_SLEEVE_HORN,
      anchor: 'sleeves',
      slots: { red: 'red' },
      id: 'home-sleeve-horn',
    }),
  ],
};
