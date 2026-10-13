import type { CompleteJerseySpec } from '../../core/complete';
import { TEXANS_NUMBER_THREE } from '../marks/numbers';
import { anchoredMark } from '../../core/jersey-spec';
import { TEXANS_BATTLE_RED_SLEEVE_SWOOSH } from '../marks/construction';

export const TEXANS_JERSEY_RED: CompleteJerseySpec = {
  body: 'red',
  collar: {
    style: 'inset-v',
    color: 'red',
    trim: 'none',
    inside: 'body',
    lining: 'navy',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'navy',
    outline: 'white',
    outlineWeight: 'regular',
    texture: 'mesh',
    glyphPath: TEXANS_NUMBER_THREE,
  },
  marks: [
    anchoredMark({
      paint: 'over',
      mark: TEXANS_BATTLE_RED_SLEEVE_SWOOSH,
      anchor: 'sleeves',
      slots: { navy: 'navy' },
      id: 'sleeve-swoosh',
    }),
  ],
};
