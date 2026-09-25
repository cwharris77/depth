import type { TeamCatalog } from '../core/catalog';

export const BEARS_CATALOG: TeamCatalog = {
  teamId: 'bears',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#0B162A', secondary: '#C83803', accent: '#C83803' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [{ from: 2012 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy-c', pants: 'navy', socks: 'white' },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'navy-c',
          pants: 'white',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0B162A', accent: '#C83803' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [{ from: 2012 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy-c', pants: 'navy', socks: 'white' },
      ],
    },
    // Bears orange alternate (modern alt, no throwback era). Hexes: orange #C83803, navy #0B162A.
    // uiAccent reuses the team's brightened orange.
    {
      slug: 'orange-alternate',
      name: 'Orange Alternate',
      kind: 'alternate',
      jersey: 'orange',
      colors: { primary: '#C83803', secondary: '#0B162A', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [{ from: 2005 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'navy-c', pants: 'navy' }],
    },
  ],
};
