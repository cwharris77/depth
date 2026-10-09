import type { TeamCatalog } from '../core/catalog';

export const PACKERS_CATALOG: TeamCatalog = {
  teamId: 'packers',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'green',
      colors: { primary: '#203731', secondary: '#FFB612', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 1959 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold',
          pants: 'gold',
          pantsNike: 'green',
          socks: 'green',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#203731', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 1959 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold',
          pants: 'gold',
          pantsNike: 'green',
          socks: 'white',
        },
      ],
    },
    {
      slug: '1923-throwback',
      name: '1923 Throwback',
      kind: 'throwback',
      jersey: 'navy',
      colors: { primary: '#1B2C4E', secondary: '#CC8835', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#CC8835', onAccent: '#0a0e1a' },
      periods: [{ from: 1923 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'leather', pants: 'leather', socks: 'navy' },
      ],
    },
    {
      slug: 'winter-warning',
      name: 'Winter Warning',
      kind: 'alternate',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#203731', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 2025 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'green',
          socks: 'white',
        },
      ],
    },
  ],
};
