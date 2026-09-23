import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { TITANS_PALETTE, TITANS_HELMETS, TITANS_PANTS, TITANS_KITS } from './parts';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_NAVY_ALT } from './jerseys/navy-alt';
import { JERSEY_LIGHT_BLUE } from './jerseys/light-blue';

export const TITANS_PARTS: TeamPartsDefinition = {
  teamId: 'titans',
  palette: TITANS_PALETTE,
  helmets: TITANS_HELMETS,
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    'navy-alt': JERSEY_NAVY_ALT,
    'light-blue': JERSEY_LIGHT_BLUE,
  },
  pants: TITANS_PANTS,
  kits: TITANS_KITS,
};
export const TITANS_UNIFORMS_FROM_PARTS = compileParts(TITANS_PARTS);
