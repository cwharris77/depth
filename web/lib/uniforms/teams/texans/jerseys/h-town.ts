import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { TEXANS_HOME_SLEEVE_HORN } from '../marks/construction';

export const TEXANS_JERSEY_H_TOWN: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'red',
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
  number: { fill: 'red', outline: 'hTownBlue', outlineWeight: 'regular', texture: 'mesh' },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: TEXANS_HOME_SLEEVE_HORN,
      anchor: 'sleeves',
      slots: { red: 'hTownBlue' },
      id: 'h-town-sleeve-horn',
    }),
  ],
};
