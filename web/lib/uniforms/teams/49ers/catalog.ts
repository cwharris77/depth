import type { TeamCatalog } from '../core/catalog';

export const NINERS_CATALOG: TeamCatalog = {
  teamId: '49ers',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#AA0000', secondary: '#B3995D', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [{ from: 2022 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold',
          pants: 'gold',
          pantsNike: 'red',
          socks: 'red',
        },
      ],
    },
    {
      slug: 'away',
      sleeveNike: 'red',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#AA0000', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [{ from: 2022 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold',
          pants: 'gold',
          pantsNike: 'red',
          socks: 'red',
        },
      ],
    },
    {
      slug: 'rivalries-2025',
      sleeveNike: 'red',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#101820', secondary: '#B3995D', accent: '#AA0000' },
      legacyAccent: { uiAccent: '#B3995D', onAccent: '#0a0e1a' },
      periods: [{ from: 2025 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black',
          pants: 'black',
          pantsNike: 'white',
          socks: 'red',
        },
      ],
    },
  ],
};
