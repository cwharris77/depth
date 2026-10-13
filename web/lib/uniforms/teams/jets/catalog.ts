import type { TeamCatalog } from '../core/catalog';

export const JETS_CATALOG: TeamCatalog = {
  teamId: 'jets',
  designs: [
    {
      id: 'jets-home-2024',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'green',
      colors: { primary: '#125740', secondary: '#FFFFFF', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource:
            'https://www.newyorkjets.com/news/jets-launch-new-uniforms-legacy-collection-2024',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Green pants',
          helmet: 'green',
          pants: 'green',
          pantsNike: 'white',
          socks: 'green',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'green',
          pants: 'white',
          pantsNike: 'green',
          socks: 'green',
        },
      ],
    },
    {
      id: 'jets-away-2024',
      slug: 'away',
      sleeveNike: 'green',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#125740', accent: '#125740' },
      legacyAccent: { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource:
            'https://www.newyorkjets.com/news/jets-reveal-throwback-legacy-white-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'green',
          pants: 'white',
          pantsNike: 'green',
          socks: 'white',
        },
        {
          key: 'green-socks',
          label: 'Green socks',
          helmet: 'green',
          pants: 'white',
          pantsNike: 'green',
          socks: 'green',
        },
        {
          key: 'green-pants',
          label: 'Green pants',
          helmet: 'green',
          pants: 'green',
          pantsNike: 'white',
          socks: 'white',
        },
        {
          key: 'green-pants-green-socks',
          label: 'Green pants, green socks',
          helmet: 'green',
          pants: 'green',
          pantsNike: 'white',
          socks: 'green',
        },
      ],
    },
    {
      id: 'jets-rivalries-2025-2025',
      slug: 'rivalries-2025',
      sleeveNike: 'white',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'riv',
      colors: { primary: '#115740', secondary: '#000000', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2025,
          startSource:
            'https://www.newyorkjets.com/news/jets-rivalries-uniform-unveiling-gotham-city-football-08-28-2025',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'riv-green',
          pants: 'riv',
          pantsNike: 'white',
          socks: 'riv',
        },
      ],
    },
    {
      id: 'jets-black-alt-2024',
      slug: 'black-alt',
      sleeveNike: 'white',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#125740', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#4CC38A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource:
            'https://www.newyorkjets.com/news/jets-launch-new-uniforms-legacy-collection-2024',
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
          socks: 'black',
        },
      ],
    },
  ],
};
