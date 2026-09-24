import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { HELMET_BURGUNDY, PANTS_BURGUNDY, PANTS_WHITE } from './parts';
import { JERSEY_BURGUNDY } from './jerseys/burgundy';
import { JERSEY_WHITE } from './jerseys/white';

export const COMMANDERS_PARTS: TeamPartsDefinition = {
  teamId: 'commanders',
  // Jersey hexes from the curated rows. Burgundy and gold are the physical body/
  // trim colors; white is the band-line/number-literal that only the home row lacks as a token.
  palette: {
    burgundy: '#5A1414',
    gold: '#FFB612',
    white: '#FFFFFF',
  },
  helmets: { burgundy: HELMET_BURGUNDY },
  jerseys: {
    burgundy: JERSEY_BURGUNDY,
    white: JERSEY_WHITE,
  },
  pants: { burgundy: PANTS_BURGUNDY, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'burgundy', jersey: 'burgundy', pants: 'burgundy' },
    away: { helmet: 'burgundy', jersey: 'white', pants: 'white' },
    '70s-burgundy': { helmet: 'burgundy', jersey: 'burgundy', pants: 'burgundy' },
  },
};

export const COMMANDERS_UNIFORMS_FROM_PARTS = compileParts(COMMANDERS_PARTS);
