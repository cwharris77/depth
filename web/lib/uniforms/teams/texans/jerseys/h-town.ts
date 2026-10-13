import type { CompleteJerseySpec } from '../../core/complete';
import { anchoredMark } from '../../core/jersey-spec';
import { TEXANS_LOGO } from '../marks/logo';

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
      mark: TEXANS_LOGO,
      anchor: 'sleeve-logos',
      slots: { keyline: 'hTownBlue', head: 'navy', horn: 'navy' },
      id: 'h-town-sleeve-logo',
    }),
  ],
};
