import type { TeamCatalog } from '../core/catalog';

export const SAINTS_CATALOG: TeamCatalog = {
  teamId: 'saints',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'gold',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#D3BC8D', secondary: '#101820', accent: '#101820' },
      legacyAccent: { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
      periods: [{ from: 2002 }],
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
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#D3BC8D', accent: '#101820' },
      legacyAccent: { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
      periods: [{ from: 2002 }],
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
      slug: 'color-rush',
      sleeveNike: 'gold',
      name: 'Color Rush',
      kind: 'color-rush',
      jersey: 'black',
      colors: { primary: '#101820', secondary: '#D3BC8D', accent: '#D3BC8D' },
      legacyAccent: { uiAccent: '#E2CC9A', onAccent: '#0a0e1a' },
      periods: [{ from: 2022 }],
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
