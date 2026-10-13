import type { CompleteJerseySpec } from '../../core/complete';
import { TEXANS_NUMBER_THREE } from '../marks/numbers';
import { anchoredMark } from '../../core/jersey-spec';
import { TEXANS_LOGO } from '../marks/logo';

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
  number: {
    fill: 'white',
    outline: 'red',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: TEXANS_NUMBER_THREE,
  },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: TEXANS_LOGO,
      anchor: 'sleeve-logos',
      slots: { keyline: 'white', head: 'navy', horn: 'red' },
      id: 'home-sleeve-logo',
    }),
  ],
};
