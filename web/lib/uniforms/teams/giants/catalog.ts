import type { TeamCatalog } from '../core/catalog';

export const GIANTS_CATALOG: TeamCatalog = {
  teamId: 'giants',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'royal',
      colors: { primary: '#0B2265', secondary: '#A71930', accent: '#A71930' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [{ from: 2000 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'blue-monogram',
          pants: 'home',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0B2265', accent: '#A71930' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [{ from: 2000 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'blue-monogram',
          pants: 'away',
          pantsNike: 'royal',
          socks: 'red',
        },
      ],
    },
    {
      slug: '1980s-throwback',
      name: '1980s Throwback',
      kind: 'throwback',
      jersey: 'throwback',
      colors: { primary: '#0B2265', secondary: '#A71930', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [{ from: 1980 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'blue-bare',
          pants: 'throwback',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
  ],
};
