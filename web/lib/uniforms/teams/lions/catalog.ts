import type { TeamCatalog } from '../core/catalog';

export const LIONS_CATALOG: TeamCatalog = {
  teamId: 'lions',
  designs: [
    {
      id: 'lions-home-2024',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'blue',
      colors: { primary: '#0076B6', secondary: '#B0B7BC', accent: '#B0B7BC' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource: 'https://www.detroitlions.com/news/detroit-lions-unveil-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-lion',
          pants: 'blue',
          pantsNike: 'blue',
          socks: 'blue',
        },
        {
          key: 'silver-pants',
          label: 'Silver pants',
          helmet: 'silver-lion',
          pants: 'silver',
          pantsNike: 'blue',
          socks: 'blue',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'silver-lion',
          pants: 'white',
          pantsNike: 'blue',
          socks: 'blue',
        },
      ],
    },
    {
      id: 'lions-away-2024',
      slug: 'away',
      sleeveNike: 'blue',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0076B6', accent: '#B0B7BC' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource: 'https://www.detroitlions.com/news/detroit-lions-unveil-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-lion',
          pants: 'silver',
          pantsNike: 'blue',
          socks: 'white',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'silver-lion',
          pants: 'white',
          pantsNike: 'blue',
          socks: 'white',
        },
        {
          key: 'blue-pants',
          label: 'Blue pants',
          helmet: 'silver-lion',
          pants: 'blue',
          pantsNike: 'blue',
          socks: 'blue',
        },
      ],
    },
    // Lions 'Gridiron Gray' alternate. Silver-gray base, Honolulu-blue trim.
    {
      id: 'lions-gridiron-gray-2017',
      slug: 'gridiron-gray',
      name: 'Gridiron Gray',
      kind: 'alternate',
      jersey: 'gray',
      colors: { primary: '#B0B7BC', secondary: '#0076B6', accent: '#000000' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2017,
          to: 2023,
          startSource: 'https://www.detroitlions.com/photos/detroit-lions-2017-uniforms-18737602',
          source: 'https://static.www.nfl.com/league/apps/league-site/media-guides/2025/DET.pdf',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-lion',
          pants: 'silver',
          socks: 'silver',
        },
      ],
    },
  ],
};
