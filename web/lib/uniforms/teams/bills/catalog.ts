import type { TeamCatalog } from '../core/catalog';

const legacyAccent = { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' };

export const BILLS_CATALOG: TeamCatalog = {
  teamId: 'bills',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'blue',
      colors: { primary: '#00338D', secondary: '#C60C30', accent: '#C60C30' },
      legacyAccent,
      periods: [{ from: 2011 }],
      combinations: [
        {
          key: 'standard',
          label: 'Royal pants',
          helmet: 'white',
          pants: 'blue',
          pantsNike: 'white',
          socks: 'navy',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'away',
      sleeveNike: 'navy',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#00338D', accent: '#C60C30' },
      legacyAccent,
      periods: [{ from: 2011 }],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
        {
          key: 'royal-pants',
          label: 'Royal pants',
          helmet: 'white',
          pants: 'blue',
          pantsNike: 'white',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'rivalries-2025',
      sleeveNike: 'rivalriesNumber',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#FFFFFF', secondary: '#00338D', accent: '#C60C30' },
      legacyAccent,
      periods: [{ from: 2025 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'ice',
          pants: 'rivalries',
          pantsNike: 'navy',
          socks: 'white',
        },
      ],
    },
  ],
};
