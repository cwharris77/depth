import type { TeamCatalog } from '../core/catalog';

const SILVER_ACCENT = { uiAccent: '#869397', onAccent: '#0a0e1a' };

export const COWBOYS_CATALOG: TeamCatalog = {
  teamId: 'cowboys',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#003594', secondary: '#869397', accent: '#869397' },
      legacyAccent: SILVER_ACCENT,
      periods: [{ from: 1964 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-star',
          pants: 'white',
          pantsNike: 'navy',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#003594', accent: '#869397' },
      legacyAccent: SILVER_ACCENT,
      periods: [{ from: 1964 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-star',
          pants: 'white',
          pantsNike: 'navy',
        },
      ],
    },
  ],
};
