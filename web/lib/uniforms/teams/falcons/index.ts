import { FALCONS_DECAL_RED } from './source';
import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { HELMET_BLACK_FALCON, PANTS_BLACK, PANTS_WHITE } from './parts';
import { JERSEY_BLACK } from './jerseys/black';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_RED } from './jerseys/red';

export const FALCONS_PARTS: TeamPartsDefinition = {
  teamId: 'falcons',
  // Jersey hexes from the curated rows; the away and red-alt rows share this
  // same palette through different primary/secondary/accent slots, which is the point. `silver`
  // also supplies the decal outer border. The 2020 "back to black" redesign's matte shell carries a
  // silver/chrome cage (atlantafalcons.com unveiling, 2020; still current in the 2026 redesign),
  // and the composite renders it as the mid-grey #909090 at 8-bit. Silver is Falcons silver
  // PMS 877 C / #A5ACAF.
  palette: {
    black: '#000000',
    white: '#FFFFFF',
    // The brand red trailing the side piping and numerals — the same physical color whether it
    // reaches home through 'primary' or away/red-alt through their own tokens.
    red: '#A71930',
    // The standalone mark supplies its fixed red independently of kit palette roles.
    decalRed: FALCONS_DECAL_RED,
    silver: '#A5ACAF',
  },
  helmets: { 'black-falcon': HELMET_BLACK_FALCON },
  jerseys: {
    black: JERSEY_BLACK,
    white: JERSEY_WHITE,
    red: JERSEY_RED,
  },
  pants: { black: PANTS_BLACK, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'black-falcon', jersey: 'black', pants: ['black', 'white'] },
    away: { helmet: 'black-falcon', jersey: 'white', pants: ['black', 'white'] },
    'red-alt': { helmet: 'black-falcon', jersey: 'red', pants: 'black' },
  },
};

export const FALCONS_UNIFORMS_FROM_PARTS = compileParts(FALCONS_PARTS);
