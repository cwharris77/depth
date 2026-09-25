// Seattle as a complete team spec: every helmet, jersey and pants part, with its own art drawn by
// the marks in ./marks.
import type { TeamSpec } from '../core/team-spec';
import {
  SEAHAWKS_NAVY_HAWK_DECAL,
  SEAHAWKS_TEAL_HAWK_DECAL,
  SEAHAWKS_THROWBACK_HAWK_DECAL,
  SEAHAWKS_THROWBACK_PANTS_CENTRE_AND_SOCKS,
  SEAHAWKS_THROWBACK_PANTS_GROUND,
} from './marks/construction';
import { SEAHAWKS_JERSEY_ACTION_GREEN } from './jerseys/action-green';
import { SEAHAWKS_JERSEY_NAVY } from './jerseys/navy';
import {
  SEAHAWKS_JERSEY_RIVALRIES,
  SEAHAWKS_RIVALRIES_JERSEY_PALETTE,
} from './jerseys/rivalries-2025';
import { SEAHAWKS_JERSEY_THROWBACK } from './jerseys/throwback';
import { SEAHAWKS_JERSEY_WHITE } from './jerseys/white';

export const SEAHAWKS_PALETTE = {
  ...SEAHAWKS_RIVALRIES_JERSEY_PALETTE,
  navy: '#002244',
  green: '#69BE28',
  // Wolf Grey is a construction fact of the modern kit, not a runtime body color: an
  // ESPN-sourced palette sets accent = secondary, so 'accent' would resolve to action green.
  wolfGrey: '#A5ACAF',
  white: '#FFFFFF',
  // Shaded insides of the neck opening, one step darker than each body so the opening reads.
  navyNeck: '#001A33',
  whiteNeck: '#ECEEEF',
  // The helmet's crown wedge: the composite's tonal step above the shell, re-based onto the brighter
  // live navy so it still reads as a lighter stripe.
  crownWedge: '#2B507C',
  // A fourth color with no kit token, and it can never have one: it fails AA on the dark UI
  // (1.57), so it could never be uiAccent. Sampled from the 2025 composite.
  rivalriesTeal: '#023A4D',
  rivalriesPine: '#29594C',
  // The throwback's royal, green and two silvers have no published codes; each is the flat fill
  // of the 2025 composite's throwback figure.
  throwbackRoyal: '#0248B3',
  // The inside of the neck opening: the royal in shadow.
  throwbackNeck: '#01358A',
  throwbackGreen: '#0E8329',
  throwbackSilver: '#A7B0BA',
  throwbackPantsSilver: '#DBDDDF',
  // The Color Rush fabric is a much brighter lime than the brand's Action Green (#69BE28) and has
  // no published code; this is the 2024 composite's flat fill.
  actionGreen: '#B6FF3E',
  actionGreenNeck: '#95D62E',
  // Sampled from the reference helmet crop.
  facemaskBlack: '#000000',
};

// The 24-unit band along the leg edge that the Color Rush and throwback pants both carry.
const edgeBand = (color: string) => ({
  position: 'leg-edge' as const,
  bands: [{ color, size: 'l' as const }],
  gap: 'none' as const,
  edge: 'none' as const,
});

// A single 16-unit stripe on the leg's seam line.
const seamStripe = (color: string) => ({
  position: 'center' as const,
  bands: [{ color, size: 'm' as const }],
  gap: 'none' as const,
  edge: 'none' as const,
});

export const SEAHAWKS_SPEC: TeamSpec = {
  helmets: {
    // Black cage, sampled from the reference crop (the facemask region reads #000000 there, against
    // the shell's #0D2135).
    'navy-hawk': {
      shell: 'navy',
      facemask: 'facemaskBlack',
      decal: SEAHAWKS_NAVY_HAWK_DECAL,
      number: 'none',
    },
    'teal-hawk': {
      shell: 'rivalriesTeal',
      facemask: 'neutral',
      decal: SEAHAWKS_TEAL_HAWK_DECAL,
      number: 'none',
    },
    // Silver shell with no stripe, a royal cage and the original hawk.
    'throwback-silver': {
      shell: 'throwbackSilver',
      facemask: 'throwbackRoyal',
      decal: SEAHAWKS_THROWBACK_HAWK_DECAL,
      number: 'none',
    },
  },
  jerseys: {
    navy: SEAHAWKS_JERSEY_NAVY,
    white: SEAHAWKS_JERSEY_WHITE,
    'action-green': SEAHAWKS_JERSEY_ACTION_GREEN,
    throwback: SEAHAWKS_JERSEY_THROWBACK,
    'rivalries-silver': SEAHAWKS_JERSEY_RIVALRIES,
  },
  pants: {
    // A green stripe on the seam line that stops at the hem, so the socks stay navy.
    navy: { body: 'navy', stripes: seamStripe('green'), marks: [] },
    // A single navy stripe on the leg edge that stops at the hem, so the socks stay green.
    'action-green': { body: 'actionGreen', stripes: edgeBand('navy'), marks: [] },
    // The away reference's white pants carry no stripe at all.
    'white-plain': { body: 'white', stripes: 'none', marks: [] },
    // Green, royal, green with white keylines, stopping at the hem; the royal socks are drawn on the
    // legs below it.
    throwback: {
      body: 'throwbackPantsSilver',
      stripes: edgeBand('throwbackGreen'),
      marks: [
        { paint: 'under', mark: SEAHAWKS_THROWBACK_PANTS_GROUND },
        { paint: 'over', mark: SEAHAWKS_THROWBACK_PANTS_CENTRE_AND_SOCKS },
      ],
    },
    'rivalries-silver': { body: 'rivalriesJerseyGrey', stripes: seamStripe('navy'), marks: [] },
  },
  socks: {
    navy: { color: 'navy', stripes: 'none' },
  },
};
