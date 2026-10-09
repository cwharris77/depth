import type { TeamCatalog } from '../core/catalog';

// Pairings are the 2025 composite's figures, canonical first.
export const PATRIOTS_CATALOG: TeamCatalog = {
  teamId: 'patriots',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#002244', secondary: '#C60C30', accent: '#B0B7BC' },
      legacyAccent: { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
      periods: [{ from: 2020 }],
      combinations: [
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'silver',
          pants: 'navy',
          pantsNike: 'white',
          socks: 'navy',
        },
        {
          key: 'silver-pants',
          label: 'Silver pants',
          helmet: 'silver',
          pants: 'silver',
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
      colors: { primary: '#FFFFFF', secondary: '#002244', accent: '#C60C30' },
      legacyAccent: { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
      periods: [{ from: 2020 }],
      combinations: [
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'silver',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'white',
        },
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'silver',
          pants: 'navy',
          pantsNike: 'white',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'rivalries-2025',
      sleeveNike: 'white',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#002F6C', secondary: '#C60C30', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [{ from: 2025 }],
      combinations: [
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'rivalries',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'royal',
        },
      ],
    },
    {
      slug: 'pat-patriot',
      sleeveNike: 'white',
      name: 'Pat Patriot',
      kind: 'throwback',
      jersey: 'pat',
      colors: { primary: '#C8102E', secondary: '#002F6C', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
      periods: [{ from: 1961 }],
      combinations: [
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'pat',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'hoops',
        },
      ],
    },
  ],
};
