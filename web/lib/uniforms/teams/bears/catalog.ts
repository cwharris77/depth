import type { TeamCatalog } from '../core/catalog';

export const BEARS_CATALOG: TeamCatalog = {
  teamId: 'bears',
  designs: [
    {
      id: 'bears-home-2012',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#0B162A', secondary: '#C83803', accent: '#C83803' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2012,
          startSource:
            'https://investors.nike.com/news-events/press-releases/detail/299/nike-and-nfl-unveil-new-2012-uniforms-with-32-nfl-athletes',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-c',
          pants: 'navy',
          pantsNike: 'white',
          socks: 'white',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'navy-c',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
    {
      id: 'bears-away-2012',
      slug: 'away',
      sleeveNike: 'navy',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0B162A', accent: '#C83803' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2012,
          startSource:
            'https://investors.nike.com/news-events/press-releases/detail/299/nike-and-nfl-unveil-new-2012-uniforms-with-32-nfl-athletes',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-c',
          pants: 'navy',
          pantsNike: 'white',
          socks: 'white',
        },
      ],
    },
    // Modern Bears orange alternate (2018 construction); the 2004 uniform is a separate era.
    // uiAccent reuses the team's brightened orange.
    {
      id: 'bears-orange-alternate-2005',
      referencePacket: {
        classification: 'detail',
        sources: [
          {
            url: 'https://www.chicagobears.com/photos/bears-debut-new-orange-nike-jerseys',
            role: 'construction and front details',
            covers: ['collar', 'wordmark', 'numerals', 'sleeves'],
          },
          {
            url: 'https://www.chicagobears.com/photos/photos-bears-unveil-new-orange-helmets-alternate',
            role: 'equipment and design identity',
            covers: ['helmet', 'paint', 'design identity'],
          },
        ],
        observed: [
          'Orange exterior collar; white numerals with navy outline.',
          'Orange helmet uses navy C with white keyline and navy cage.',
        ],
        approximations: [
          'GSH font and shoulder-digit projection are approximate.',
          'Navy-helmet sock pairing needs dated game-photo confirmation.',
        ],
      },
      slug: 'orange-alternate',
      sleeveNike: 'white',
      name: 'Orange Alternate',
      kind: 'alternate',
      jersey: 'orange',
      colors: { primary: '#C83803', secondary: '#0B162A', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2018,
          startSource:
            'https://www.chicagobears.com/news/bears-reveal-jersey-colors-for-all-2018-games',
          verifiedOn: '2026-10-19',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Orange helmet / white pants (2022+)',
          helmet: 'orange-c',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'orange',
        },
        {
          key: 'navy-helmet',
          label: 'Navy helmet / white pants (2018+)',
          helmet: 'navy-c',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
  ],
};
