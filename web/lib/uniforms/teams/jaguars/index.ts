import { JAGUARS_BLACK, JAGUARS_DECAL_PATHS } from './source';
import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { HELMET_BLACK, HELMET_TEAL, PANTS_BLACK, PANTS_TEAL, PANTS_WHITE } from './parts';
import { JERSEY_TEAL } from './jerseys/teal';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_TR } from './jerseys/tr';
import { JERSEY_BLACK_ALT } from './jerseys/black-alt';

export const JAGUARS_PARTS: TeamPartsDefinition = {
  teamId: 'jaguars',
  // Construction hexes from the module / curated rows. Teal/gold/black/white are the physical body
  // colors; the decal gold/teal are fixed art.
  palette: {
    teal: '#006778',
    gold: '#D7A22A',
    black: JAGUARS_BLACK,
    white: '#FFFFFF',
    // Every decal hex comes directly from Cooper's supplied SVG, including minor shading.
    ...Object.fromEntries(JAGUARS_DECAL_PATHS.map(({ fill }) => [fill, fill])),
  },
  helmets: { black: HELMET_BLACK, throwback: HELMET_TEAL },
  jerseys: {
    teal: JERSEY_TEAL,
    white: JERSEY_WHITE,
    tr: JERSEY_TR,
    blackAlt: JERSEY_BLACK_ALT,
  },
  pants: { white: PANTS_WHITE, black: PANTS_BLACK, teal: PANTS_TEAL },
  kits: {
    // GUD 2025 JAX: home white/teal; away white/teal/black. Canonical pairings stay first.
    home: { helmet: 'black', jersey: 'teal', pants: ['white', 'teal'] },
    away: { helmet: 'black', jersey: 'white', pants: ['white', 'teal', 'black'] },
    'teal-throwback': { helmet: 'throwback', jersey: 'tr', pants: 'white' },
    'black-alt': { helmet: 'black', jersey: 'blackAlt', pants: 'black' },
  },
};

export const JAGUARS_UNIFORMS_FROM_PARTS = compileParts(JAGUARS_PARTS);
