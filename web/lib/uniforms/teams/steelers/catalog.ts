import { type TeamCatalog } from '../core/catalog';

export const STEELERS_CATALOG: TeamCatalog = {
  teamId: 'steelers',
  designs: [
    {
      id: 'steelers-home-1997',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#FFB612', secondary: '#101820', accent: '#101820' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1997,
          startSource: 'https://www.steelers.com/news/asked-and-answered-march-19-x8711',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black',
          pants: 'gold',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
    {
      id: 'steelers-away-1997',
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#FFB612', accent: '#101820' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1997,
          startSource: 'https://www.steelers.com/news/asked-and-answered-march-19-x8711',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black',
          pants: 'gold',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
    {
      id: 'steelers-bumblebee-1933',
      slug: 'bumblebee',
      name: 'Bumblebee',
      kind: 'throwback',
      jersey: 'bumblebee',
      colors: { primary: '#101820', secondary: '#FFB612', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1934,
          to: 1934,
          startSource: 'https://www.steelers.com/news/when-it-all-began-for-the-steelers-17316209',
          source:
            'https://www.steelers.com/news/labriola-on-bumblebees-switching-positions-17834360',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'gold', pants: 'khaki', socks: 'gold' },
      ],
    },
  ],
};
