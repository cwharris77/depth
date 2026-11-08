import type { TeamCatalog } from '../core/catalog';

export const GIANTS_CATALOG: TeamCatalog = {
  teamId: 'giants',
  designs: [
    {
      id: 'giants-home-2000',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'royal',
      colors: { primary: '#0B2265', secondary: '#A71930', accent: '#A71930' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2000,
          startSource: 'https://www.giants.com/photos/photos-evolution-of-the-giants-uniform',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: 'giants-away-2000',
      slug: 'away',
      sleeveNike: 'red',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0B2265', accent: '#A71930' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2005,
          startSource:
            'https://static.www.nfl.com/league/apps/league-site/media-guides/2022/NYG.pdf',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: 'giants-1980s-throwback-1980',
      slug: '1980s-throwback',
      sleeveNike: 'white',
      name: '1980s Throwback',
      kind: 'throwback',
      jersey: 'throwback',
      colors: { primary: '#0B2265', secondary: '#A71930', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2022,
          startSource:
            'https://www.giants.com/news/new-uniform-classic-helmets-jersey-information-nfl-legacy-games-2022-schedule',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-wordmark',
          pants: 'throwback',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
    {
      id: 'giants-vintage-white-2016',
      slug: 'vintage-white',
      sleeveNike: 'royal',
      name: 'Vintage White',
      kind: 'color-rush',
      jersey: 'vintage-white',
      colors: { primary: '#FFFFFF', secondary: '#0B2265', accent: '#A71930' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2016,
          to: 2023,
          startSource:
            'https://www.giants.com/news/giants-announce-2026-uniform-schedule-legacy-games-vintage-white',
          source: 'https://giants.com/news/giants-announce-2025-uniform-schedule-legacy-games',
          verifiedOn: '2026-10-22',
        },
        {
          from: 2025,
          startSource: 'https://giants.com/news/giants-announce-2025-uniform-schedule-legacy-games',
          verifiedOn: '2026-10-22',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-wordmark',
          pants: 'throwback',
          pantsNike: 'royal',
          socks: 'white',
        },
      ],
    },
  ],
};
