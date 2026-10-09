import type { TeamCatalog } from '../core/catalog';

// Both kits are the 2025 composite's figures: silver pants and black socks under each jersey.
export const RAIDERS_CATALOG: TeamCatalog = {
  teamId: 'raiders',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'silver',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#A5ACAF', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
      periods: [{ from: 1963 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-shield',
          pants: 'silver',
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
      colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
      periods: [{ from: 1963 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-shield',
          pants: 'silver',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
  ],
};
