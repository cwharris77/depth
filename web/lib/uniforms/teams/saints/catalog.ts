import type { TeamCatalog } from '../core/catalog';

export const SAINTS_CATALOG: TeamCatalog = {
  teamId: 'saints',
  designs: [
    {
      id: 'saints-home-2002',
      slug: 'home',
      sleeveNike: 'gold',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#D3BC8D', secondary: '#101820', accent: '#101820' },
      legacyAccent: { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2002,
          startSource: 'https://www.neworleanssaints.com/team/history/uniform-history',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold-fleur',
          pants: 'gold',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
    {
      id: 'saints-away-2002',
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#D3BC8D', accent: '#101820' },
      legacyAccent: { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2002,
          startSource: 'https://www.neworleanssaints.com/team/history/uniform-history',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold-fleur',
          pants: 'black',
          pantsNike: 'white',
          socks: 'black',
        },
      ],
    },
    {
      id: 'saints-color-rush-2022',
      slug: 'color-rush',
      sleeveNike: 'gold',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#101820', secondary: '#D3BC8D', accent: '#D3BC8D' },
      legacyAccent: { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2001,
          startSource: 'https://static.clubs.nfl.com/image/upload/saints/cztpkmq4rpa8o145aj2s.pdf',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold-fleur',
          pants: 'black',
          pantsNike: 'white',
          socks: 'black',
        },
      ],
    },
  ],
};
