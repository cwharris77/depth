import type { TeamCatalog } from '../core/catalog';

export const COLTS_CATALOG: TeamCatalog = {
  teamId: 'colts',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#002C5F', secondary: '#A2AAAD', accent: '#A2AAAD' },
      legacyAccent: { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
      periods: [{ from: 2004 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white-horseshoe',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#002C5F', accent: '#A2AAAD' },
      legacyAccent: { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
      periods: [{ from: 2004 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white-horseshoe',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
  ],
};
