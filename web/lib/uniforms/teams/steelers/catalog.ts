import { NEEDS_SOURCE, type TeamCatalog } from '../core/catalog';

export const STEELERS_CATALOG: TeamCatalog = {
  teamId: 'steelers',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#FFB612', secondary: '#101820', accent: '#101820' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 1997 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'black', pants: 'gold', socks: 'black' },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#FFB612', accent: '#101820' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 1997 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'black', pants: 'gold', socks: 'black' },
      ],
    },
    {
      slug: 'bumblebee',
      name: 'Bumblebee',
      kind: 'throwback',
      jersey: 'bumblebee',
      colors: { primary: '#101820', secondary: '#FFB612', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 1933, to: 1934, source: NEEDS_SOURCE }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'gold', pants: 'khaki', socks: 'gold' },
      ],
    },
  ],
};
