import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { HELMET_SILVER_STAR, PANTS_WHITE, star } from './parts';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_WHITE } from './jerseys/white';

export const COWBOYS_PARTS: TeamPartsDefinition = {
  teamId: 'cowboys',
  // Jersey hexes from the curated rows (teamcolorcodes), plus the published helmet shell and the
  // GUD-sampled cage. The away row reaches navy through its secondary and silver through accent;
  // home reaches silver through secondary — each is one palette entry here.
  palette: {
    navy: '#003594',
    white: '#FFFFFF',
    // Exact colors retained from the supplied star source; they are intentionally separate from
    // the jersey navy/white palette values.
    sourceNavy: '#032343',
    sourceWhite: '#FCFCFC',
    silver: '#869397',
    // The published helmet "Blue Metallic" — the shell is several steps lighter than the jersey
    // silver (see cowboys.ts).
    helmetSilver: COWBOYS_HELMET_SILVER,
    // Sampled from the GUD composite (nfl-uniform-refs/cowboys): the cage bars read #808080
    // against the shell's #B7C3CD. Steel/silver per named sources.
    steelGrey: '#808080',
  },
  helmets: { 'silver-star': HELMET_SILVER_STAR },
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
  },
  pants: { white: PANTS_WHITE },
  kits: {
    home: { helmet: 'silver-star', jersey: 'navy', pants: 'white' },
    away: { helmet: 'silver-star', jersey: 'white', pants: 'white' },
  },
};

export const COWBOYS_UNIFORMS_FROM_PARTS = compileParts(COWBOYS_PARTS);
