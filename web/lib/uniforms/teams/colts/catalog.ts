import type { TeamCatalog } from '../core/catalog';

export const COLTS_CATALOG: TeamCatalog = {
  teamId: 'colts',
  designs: [
    {
      id: 'colts-home-2004',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#002C5F', secondary: '#A2AAAD', accent: '#A2AAAD' },
      legacyAccent: { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
      periods: [
        { from: 2020, startSource: 'https://www.colts.com/team/brand/', verifiedOn: '2026-10-12' },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white-horseshoe',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
    {
      id: 'colts-away-2004',
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#002C5F', accent: '#A2AAAD' },
      legacyAccent: { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
      periods: [
        { from: 2020, startSource: 'https://www.colts.com/team/brand/', verifiedOn: '2026-10-12' },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white-horseshoe',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'white',
        },
      ],
    },
    {
      id: 'colts-indiana-nights-2023',
      slug: 'indiana-nights',
      sleeveNike: 'white',
      name: 'Indiana Nights',
      kind: 'alternate',
      jersey: 'indiana-nights',
      colors: { primary: '#002C5F', secondary: '#000000', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource: 'https://www.colts.com/team/indiana-nights/',
          verifiedOn: '2026-11-10',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'indiana-nights',
          pants: 'navy',
          pantsNike: 'white',
          socks: 'navy',
        },
      ],
    },
  ],
};
