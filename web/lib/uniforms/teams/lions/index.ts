import { compileParts, type TeamPartsDefinition } from '../core/parts';
import { HELMET_SILVER_LION, PANTS_BLUE, PANTS_SILVER } from './parts';
import { JERSEY_BLUE } from './jerseys/blue';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_GRAY } from './jerseys/gray';

export const LIONS_PARTS: TeamPartsDefinition = {
  teamId: 'lions',
  // Jersey hexes from the curated rows. Silver is the shell/body color that the
  // rows carry across different primary/secondary/accent slots; blue is home/away's shared body.
  palette: {
    blue: '#0076B6',
    white: '#FFFFFF',
    silver: '#B0B7BC',
  },
  helmets: { 'silver-lion': HELMET_SILVER_LION },
  jerseys: {
    blue: JERSEY_BLUE,
    white: JERSEY_WHITE,
    gray: JERSEY_GRAY,
  },
  pants: { blue: PANTS_BLUE, silver: PANTS_SILVER },
  kits: {
    home: { helmet: 'silver-lion', jersey: 'blue', pants: 'blue' },
    away: { helmet: 'silver-lion', jersey: 'white', pants: 'silver' },
    'gridiron-gray': { helmet: 'silver-lion', jersey: 'gray', pants: 'silver' },
  },
};

export const LIONS_UNIFORMS_FROM_PARTS = compileParts(LIONS_PARTS);
