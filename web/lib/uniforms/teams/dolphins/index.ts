import { compileParts, type TeamPartsDefinition } from '../core/parts';
import {
  HELMET_NAVY,
  HELMET_WHITE,
  HELMET_WHITE_1972,
  PANTS_NAVY,
  PANTS_TEAL,
  PANTS_WHITE,
} from './parts';
import { JERSEY_TEAL } from './jerseys/teal';
import { JERSEY_WHITE } from './jerseys/white';
import { JERSEY_NAVY } from './jerseys/navy';
import { JERSEY_1972 } from './jerseys/1972';

export const DOLPHINS_PARTS: TeamPartsDefinition = {
  teamId: 'dolphins',
  // Jersey hexes from the curated rows (teamcolorcodes). Teal/orange/white/navy are the physical
  // body colors carried in different primary/secondary/accent slots per row.
  palette: {
    teal: '#008E97',
    orange: '#FC4C02',
    white: '#FFFFFF',
    navy: '#101820',
  },
  helmets: { white: HELMET_WHITE, navy: HELMET_NAVY, white1972: HELMET_WHITE_1972 },
  jerseys: {
    teal: JERSEY_TEAL,
    white: JERSEY_WHITE,
    navy: JERSEY_NAVY,
    '1972': JERSEY_1972,
  },
  pants: { white: PANTS_WHITE, teal: PANTS_TEAL, navy: PANTS_NAVY },
  kits: {
    home: { helmet: 'white', jersey: 'teal', pants: 'white' },
    away: { helmet: 'white', jersey: 'white', pants: ['teal', 'white'] },
    'rivalries-2025': { helmet: 'navy', jersey: 'navy', pants: 'navy' },
    '1972-throwback': { helmet: 'white1972', jersey: '1972', pants: 'white' },
  },
};

export const DOLPHINS_UNIFORMS_FROM_PARTS = compileParts(DOLPHINS_PARTS);
