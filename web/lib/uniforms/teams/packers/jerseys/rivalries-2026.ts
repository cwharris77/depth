import type { CompleteJerseySpec } from '../../core/complete';
import { PACKERS_NUMBER_THREE } from '../marks/numbers';
import { PACKERS_RIVALRIES_COLLAR_LABEL } from '../marks/labels';
import { PACKERS_RIVALRIES_CHEST_GB } from '../marks/rivalries-chest';
import { PACKERS_RIVALRIES_SLEEVE_BAND } from '../marks/rivalries-sleeve';

export const PACKERS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'rivalriesGreen',
  collar: {
    style: 'inset-v',
    color: 'alabaster',
    trim: 'alabaster',
    inside: 'body',
    lining: 'rivalriesGold',
    backBar: 'alabaster',
    outline: true,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'alabaster', outline: 'rivalriesGold' },
  sleeveStripes: {
    bands: [
      { color: 'alabaster', size: 'l' },
      { color: 'rivalriesGold', size: 'm' },
      { color: 'alabaster', size: 'l' },
    ],
    gap: 'none',
    edge: 'none',
    position: 'hem',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    height: 185,
    fill: 'alabaster',
    outline: 'rivalriesGold',
    outlineWeight: 'thin',
    texture: 'plain',
    glyphPath: PACKERS_NUMBER_THREE,
  },
  marks: [
    { paint: 'over', mark: PACKERS_RIVALRIES_SLEEVE_BAND },
    { paint: 'over', mark: PACKERS_RIVALRIES_CHEST_GB },
    { paint: 'over', mark: PACKERS_RIVALRIES_COLLAR_LABEL },
  ],
};
