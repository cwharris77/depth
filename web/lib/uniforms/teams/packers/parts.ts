// Green Bay as a complete team spec: every helmet, jersey, pants and socks part, with the helmet
// art drawn by the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import { PACKERS_HELMET_DECAL } from './marks/construction';
import { PACKERS_JERSEY_GREEN } from './jerseys/green';
import { PACKERS_JERSEY_NAVY } from './jerseys/navy';
import { PACKERS_JERSEY_WHITE } from './jerseys/white';
import { PACKERS_JERSEY_RIVALRIES } from './jerseys/rivalries-2026';
import { PACKERS_RIVALRIES_HELMET } from './marks/rivalries-2026';

// Green, gold and white are the physical colours the rows carry in different slots. The three hex
// keys are the foreground paints of the supplied G, kept apart from the construction colours
// because the source green, white and gold are each visibly distinct. Leather, navy and bronze
// belong to the 1923 throwback; cageGrey is the white shell's mask.
export const PACKERS_PALETTE = {
  green: '#203731',
  gold: '#FFB612',
  white: '#FFFFFF',
  '#213832': '#213832',
  '#FCFCFC': '#FCFCFC',
  '#FEB415': '#FEB415',
  leather: '#7B4A2A',
  cageGrey: '#8F8F90',
  navy: '#1B2C4E',
  bronze: '#CC8835',
  // Rivalries colors are unpublished; these are flat approximations of the jersey cloth and twill.
  rivalriesGreen: '#445251',
  alabaster: '#EBDBB2',
  rivalriesGold: '#DAAF33',
  rivalriesLattice: '#AA7716',
  black: '#000000',
};

const none = 'none' as const;

// Three equal stripes on the leg's outer edge, stopping at the hem.
const legStripe = (outer: string, middle: string) => ({
  position: 'leg-edge' as const,
  bands: [
    { color: outer, size: 's' as const },
    { color: middle, size: 's' as const },
    { color: outer, size: 's' as const },
  ],
  gap: 'none' as const,
  edge: none,
});

export const PACKERS_SPEC: TeamSpec = {
  helmets: {
    // Green and white crown stripe, G decal and green cage on the gold shell.
    gold: { shell: 'gold', facemask: 'green', decal: PACKERS_HELMET_DECAL, number: none },
    // The white shell with the crown stripe and G, grey cage.
    white: { shell: 'white', facemask: 'cageGrey', decal: PACKERS_HELMET_DECAL, number: none },
    // The 1923 leather shell, bare: no stripe, no decal, and the shared grey cage.
    leather: { shell: 'leather', facemask: 'neutral', decal: none, number: none },
    rivalries: {
      shell: 'alabaster',
      facemask: 'rivalriesGreen',
      decal: PACKERS_RIVALRIES_HELMET,
      number: none,
    },
  },
  jerseys: {
    green: PACKERS_JERSEY_GREEN,
    white: PACKERS_JERSEY_WHITE,
    navy: PACKERS_JERSEY_NAVY,
    rivalries: PACKERS_JERSEY_RIVALRIES,
  },
  pants: {
    gold: { body: 'gold', stripes: legStripe('green', 'white'), marks: [] },
    white: { body: 'white', stripes: legStripe('green', 'gold'), marks: [] },
    leather: { body: 'leather', stripes: none, marks: [] },
    alabaster: {
      body: 'alabaster',
      stripes: legStripe('rivalriesGreen', 'rivalriesGold'),
      marks: [],
    },
  },
  socks: {
    green: { color: 'green', stripes: none },
    white: { color: 'white', stripes: none },
    navy: { color: 'navy', stripes: none },
    rivalries: { color: 'rivalriesGreen', stripes: none },
  },
};
