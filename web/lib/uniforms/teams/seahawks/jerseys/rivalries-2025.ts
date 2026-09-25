// Seahawks 2025 Rivalries jersey. Hexes are flat approximations of Wolf Grey, College Navy and the
// reflective olive print; the neck grey represents the shaded opening. The numeral is drawn plain,
// without the repeating 12 microtexture.
import type { CompleteJerseySpec } from '../../core/complete';
import { SEAHAWKS_RIVALRIES_PRINT } from '../marks/rivalries';

export const SEAHAWKS_RIVALRIES_JERSEY_PALETTE = {
  rivalriesJerseyNeck: '#92989B',
  rivalriesJerseyGrey: '#AFB3B5',
  rivalriesJerseyNavy: '#102438',
  rivalriesJerseyOlive: '#667443',
  rivalriesJerseyGreen: '#435B3D',
  rivalriesJerseyBronze: '#817350',
};

export const SEAHAWKS_JERSEY_RIVALRIES: CompleteJerseySpec = {
  body: 'rivalriesJerseyGrey',
  collar: {
    style: 'inset-v',
    color: 'rivalriesJerseyGrey',
    trim: 'rivalriesJerseyNavy',
    inside: 'rivalriesJerseyNeck',
    lining: 'none',
    backBar: 'none',
    outline: false,
  },
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: 'none',
  sleeveStripes: 'none',
  cuff: 'none',
  sleeveNumber: 'none',
  number: {
    fill: 'rivalriesJerseyOlive',
    outline: 'rivalriesJerseyNavy',
    outlineWeight: 'thin',
    texture: 'plain',
  },
  // The print, the navy cuffs and the wordmark, beneath the collar.
  marks: [{ paint: 'under', mark: SEAHAWKS_RIVALRIES_PRINT }],
};
