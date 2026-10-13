import type { TeamCatalog } from '../core/catalog';

export const CARDINALS_CATALOG: TeamCatalog = {
  teamId: 'cardinals',
  designs: [
    {
      id: 'cardinals-home-2023',
      slug: 'home',
      sleeveNike: 'white',
      collarShield: true,
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#97233F', secondary: '#000000', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource:
            'https://www.azcardinals.com/news/longform/new-uniforms-for-the-arizona-cardinals-2023',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white',
          pants: 'red',
          pantsNike: 'white',
          socks: 'red',
        },
      ],
    },
    {
      id: 'cardinals-away-2023',
      slug: 'away',
      sleeveNike: 'cardinal',
      collarShield: true,
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#97233F', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource:
            'https://www.azcardinals.com/news/longform/new-uniforms-for-the-arizona-cardinals-2023',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'cardinal',
          socks: 'white',
        },
      ],
    },
    {
      id: 'cardinals-rivalries-2025-2025',
      slug: 'rivalries-2025',
      sleeveNike: 'rivalRed',
      collarShield: true,
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#FFF7E3', secondary: '#B31529', accent: '#EE6B3D' },
      legacyAccent: { uiAccent: '#EE6B3D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2025,
          startSource:
            'https://www.azcardinals.com/news/arizona-cardinals-unveil-rivalries-uniforms-nike-sand-copper-red-2025',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'cream',
          pants: 'cream',
          pantsNike: 'rivalRed',
          socks: 'rivalries',
        },
      ],
    },
    {
      id: 'cardinals-black-alt-2023',
      slug: 'black-alt',
      sleeveNike: 'white',
      collarShield: true,
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#97233F', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource:
            'https://www.azcardinals.com/news/longform/new-uniforms-for-the-arizona-cardinals-2023',
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
