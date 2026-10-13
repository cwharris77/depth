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
    // Bears orange alternate (modern alt, no throwback era). Hexes: orange #C83803, navy #0B162A.
    // uiAccent reuses the team's brightened orange.
    {
      id: 'bears-orange-alternate-2005',
      slug: 'orange-alternate',
      sleeveNike: 'white',
      name: 'Orange Alternate',
      kind: 'alternate',
      jersey: 'orange',
      colors: { primary: '#C83803', secondary: '#0B162A', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2004,
          to: 2011,
          startSource:
            'https://www.chicagobears.com/news/chalktalk/chalk-talk-when-was-last-time-bears-wore-orange',
          source: 'https://www.chicagobears.com/news/bears-reveal-jersey-colors-for-all-2018-games',
          verifiedOn: '2026-10-12',
        },
        {
          from: 2018,
          startSource:
            'https://www.chicagobears.com/news/bears-reveal-jersey-colors-for-all-2018-games',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy-c', pants: 'navy', pantsNike: 'white' },
      ],
    },
  ],
};
