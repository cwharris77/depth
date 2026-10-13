import type { TeamCatalog } from '../core/catalog';

export const NINERS_CATALOG: TeamCatalog = {
  teamId: '49ers',
  designs: [
    {
      id: '49ers-home-2022',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#AA0000', secondary: '#B3995D', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2022,
          startSource:
            'https://www.49ers.com/news/49ers-unveil-classic-updates-to-standard-home-and-away-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: '49ers-away-2022',
      slug: 'away',
      sleeveNike: 'red',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#AA0000', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2022,
          startSource:
            'https://www.49ers.com/news/49ers-unveil-classic-updates-to-standard-home-and-away-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: '49ers-rivalries-2025-2025',
      slug: 'rivalries-2025',
      sleeveNike: 'red',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#101820', secondary: '#B3995D', accent: '#AA0000' },
      legacyAccent: { uiAccent: '#B3995D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2025,
          startSource:
            'https://www.49ers.com/news/rivalries-night-paints-levis-stadium-black-49ers',
          verifiedOn: '2026-10-12',
        },
      ],
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
