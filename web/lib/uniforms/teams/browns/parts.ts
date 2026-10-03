// Cleveland as a complete team spec: every helmet, jersey, pants and socks part, with its own art
// drawn by the marks in ./marks.
//
// Cleveland's construction is defined by what it does NOT have: the shell carries no logo and no
// center stripe, the V-collar carries no trim, and the numerals carry no keyline. Everything the
// uniform says, it says with one five-band stripe stack on each sleeve and a three-band pant
// stripe. The white and orange pants are independently selectable with the home and away jerseys;
// the 1946 throwback keeps its own unstriped white pants.
import type { TeamSpec } from '../core/team-spec';
import { BROWNS_PANTS_CENTRE_LINE } from './marks/construction';
import { BROWNS_JERSEY_BROWN } from './jerseys/brown';
import { BROWNS_JERSEY_WHITE } from './jerseys/white';

// Brown and orange are the two physical colors carried in different primary/secondary/accent
// slots per row; white is the pants/numerals literal.
export const BROWNS_PALETTE = {
  brown: '#311D00',
  orange: '#FF3C00',
  white: '#FFFFFF',
};

// An orange 16-unit band on the leg's seam line with a brown centre line over it, stopping at the
// hem.
const seamStripe = {
  position: 'center' as const,
  bands: [{ color: 'orange', size: 'm' as const }],
  gap: 'none' as const,
  edge: 'none' as const,
};

const striped = (body: string) => ({
  body,
  stripes: seamStripe,
  marks: [{ paint: 'over' as const, mark: BROWNS_PANTS_CENTRE_LINE }],
});

const hoops = (outer: string) => ({
  bands: [
    { color: outer, size: 's' as const },
    { color: 'orange', size: 's' as const },
    { color: outer, size: 's' as const },
  ],
  gap: 'none' as const,
  edge: 'none' as const,
});

export const BROWNS_SPEC: TeamSpec = {
  helmets: {
    // The bare orange shell, shared by home and away, with a white cage.
    orange: { shell: 'orange', facemask: 'white', decal: 'none', number: 'none' },
    // The 1946 throwback's brown shell, with the same white cage.
    brown: { shell: 'brown', facemask: 'white', decal: 'none', number: 'none' },
  },
  jerseys: {
    brown: BROWNS_JERSEY_BROWN,
    white: BROWNS_JERSEY_WHITE,
  },
  pants: {
    white: striped('white'),
    orange: striped('orange'),
    // The color-rush brown pants are unstriped.
    brown: { body: 'brown', stripes: 'none', marks: [] },
    '1946-white': { body: 'white', stripes: 'none', marks: [] },
  },
  socks: {
    brown: { color: 'brown', stripes: hoops('white') },
    white: { color: 'white', stripes: hoops('brown') },
    '1946-white': { color: 'white', stripes: 'none' },
  },
};
