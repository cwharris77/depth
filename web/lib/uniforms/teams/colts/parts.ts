// Indianapolis palette, helmet, pants and kits. Both kits share the white horseshoe helmet and
// white pants; only the jersey differs.

import { COLTS_DECAL_HORSESHOE_NAVY_PATH, COLTS_DECAL_HORSESHOE_WHITE_PATH } from './source';
import { type UniformPart } from '../core/parts';

// White shell with the navy horseshoe decal and a light speedway-grey cage. The horseshoe is a
// single band with its seven isolated rivets restored on top in white.
const HELMET_WHITE_HORSESHOE: UniformPart = {
  base: 'white',
  facemask: 'speedwayGrey',
  layers: [
    {
      id: 'colts-helmet-horseshoe-band',
      surface: 'helmet',
      d: COLTS_DECAL_HORSESHOE_NAVY_PATH,
      clip: true,
      kind: 'fill',
      fill: 'navy',
    },
    {
      id: 'colts-helmet-horseshoe-rivets',
      surface: 'helmet',
      d: COLTS_DECAL_HORSESHOE_WHITE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ],
};

// Plain white pants, shared by both kits.
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

export const COLTS_CONSTRUCTION = {
  teamId: 'colts',
  palette: {
    navy: '#002C5F',
    white: '#FFFFFF',
    speedwayGrey: '#A2AAAD',
  },
  helmets: { 'white-horseshoe': HELMET_WHITE_HORSESHOE },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'white-horseshoe', jersey: 'navy', pants: 'white' },
    away: { helmet: 'white-horseshoe', jersey: 'white', pants: 'white' },
  },
};
