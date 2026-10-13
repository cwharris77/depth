import type { TeamCatalog } from '../core/catalog';

export const CHIEFS_CATALOG: TeamCatalog = {
  teamId: 'chiefs',
  designs: [
    {
      id: 'chiefs-home-1963',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#E31837', secondary: '#FFB81C', accent: '#FFB81C' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1963,
          startSource:
            'https://www.chiefs.com/news/patch-work-lamar-hunt-s-love-of-uniform-patches',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'red-arrowhead',
          pants: 'white',
          pantsNike: 'red',
          socks: 'red',
        },
      ],
    },
    {
      id: 'chiefs-away-1963',
      slug: 'away',
      sleeveNike: 'red',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#E31837', accent: '#FFB81C' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1963,
          startSource:
            'https://www.chiefs.com/news/patch-work-lamar-hunt-s-love-of-uniform-patches',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'red-arrowhead',
          pants: 'white',
          pantsNike: 'red',
          socks: 'white',
        },
        {
          key: 'red-pants',
          label: 'Red pants',
          helmet: 'red-arrowhead',
          pants: 'red',
          pantsNike: 'white',
          socks: 'white',
        },
      ],
    },
  ],
};
