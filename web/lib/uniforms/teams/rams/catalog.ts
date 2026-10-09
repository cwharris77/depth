import type { TeamCatalog } from '../core/catalog';

// Combinations are the pairings the 2025 composite shows, canonical first.
export const RAMS_CATALOG: TeamCatalog = {
  teamId: 'rams',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'royal',
      colors: { primary: '#003594', secondary: '#FFA300', accent: '#FFA300' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [{ from: 2020 }],
      combinations: [
        {
          key: 'gold-pants',
          label: 'Gold pants',
          helmet: 'royal-horn',
          pants: 'gold',
          pantsNike: 'royal',
          socks: 'royal',
        },
        {
          key: 'bone-pants',
          label: 'Bone pants',
          helmet: 'royal-horn',
          pants: 'bone',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
    {
      slug: 'away',
      sleeveNike: 'royal',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#003594', accent: '#FFA300' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [{ from: 2020 }],
      combinations: [
        {
          key: 'royal-pants',
          label: 'Royal pants',
          helmet: 'royal-horn',
          pants: 'royal',
          pantsNike: 'white',
          socks: 'royal',
        },
        {
          key: 'gold-pants',
          label: 'Gold pants',
          helmet: 'royal-horn',
          pants: 'gold',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
    {
      slug: 'rivalries-2025',
      sleeveNike: 'white',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#0D1B3E', secondary: '#FFD100', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [{ from: 2025 }],
      combinations: [
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'navy-horn',
          pants: 'navy',
          pantsNike: 'white',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'bone',
      sleeveNike: 'royal',
      name: 'Bone',
      kind: 'alternate',
      jersey: 'bone',
      colors: { primary: '#F0EBE0', secondary: '#003594', accent: '#FFA300' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [{ from: 2020 }],
      combinations: [
        {
          key: 'bone-pants',
          label: 'Bone pants',
          helmet: 'royal-horn',
          pants: 'bone',
          pantsNike: 'royal',
          socks: 'bone',
        },
      ],
    },
  ],
};
