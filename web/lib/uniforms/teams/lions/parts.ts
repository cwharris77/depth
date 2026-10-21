// Detroit as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import {
  LIONS_BLACK_HELMET_DECAL,
  LIONS_HELMET_DECAL,
  LIONS_2017_HELMET_DECAL,
} from './marks/construction';
import { LIONS_JERSEY_BLUE } from './jerseys/blue';
import { LIONS_JERSEY_BLACK } from './jerseys/black';
import { LIONS_JERSEY_CLASSIC } from './jerseys/classic';
import { LIONS_JERSEY_GRAY } from './jerseys/gray';
import { LIONS_JERSEY_WHITE } from './jerseys/white';

// Honolulu blue and silver are the physical colours; the silver shell and pants share one key.
export const LIONS_PALETTE = {
  // Blue and silver are flat approximations of the current jersey cloth.
  blue: '#0264AE',
  white: '#FFFFFF',
  silver: '#A3A6AA',
  black: '#000000',
  darkSteel: '#545859',
};

const none = 'none' as const;

export const LIONS_SPEC: TeamSpec = {
  helmets: {
    'silver-classic': { shell: 'silver', facemask: 'silver', decal: none, number: none },
    'silver-2017': {
      shell: 'silver',
      facemask: 'silver',
      decal: LIONS_2017_HELMET_DECAL,
      number: none,
    },
    'silver-lion': {
      shell: 'silver',
      facemask: 'blue',
      decal: LIONS_HELMET_DECAL,
      number: none,
    },
    'black-lion': {
      shell: 'blue',
      facemask: 'black',
      decal: LIONS_BLACK_HELMET_DECAL,
      number: none,
    },
  },
  jerseys: {
    blue: LIONS_JERSEY_BLUE,
    white: LIONS_JERSEY_WHITE,
    gray: LIONS_JERSEY_GRAY,
    black: LIONS_JERSEY_BLACK,
    classic: LIONS_JERSEY_CLASSIC,
  },
  pants: {
    blue: { body: 'blue', stripes: none, marks: [] },
    darkSteel: { body: 'darkSteel', stripes: none, marks: [] },
    silver: { body: 'silver', stripes: none, marks: [] },
    'silver-striped': {
      body: 'silver',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'blue', size: 's' },
          { color: 'white', size: 's' },
          { color: 'blue', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    white: { body: 'white', stripes: none, marks: [] },
    black: { body: 'black', stripes: none, marks: [] },
  },
  socks: {
    blue: { color: 'blue', stripes: none },
    darkSteel: { color: 'darkSteel', stripes: none },
    white: { color: 'white', stripes: none },
    silver: { color: 'silver', stripes: none },
    black: { color: 'black', stripes: none },
  },
};
