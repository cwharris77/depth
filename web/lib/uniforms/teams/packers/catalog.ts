import type { TeamCatalog } from '../core/catalog';

export const PACKERS_CATALOG: TeamCatalog = {
  teamId: 'packers',
  designs: [
    {
      id: 'packers-home-1959',
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'green',
      colors: { primary: '#203731', secondary: '#FFB612', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1959,
          startSource: 'https://www.packers.com/news/packers-first-wore-green-jerseys-in-1935',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: 'packers-away-1959',
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#203731', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1959,
          startSource: 'https://www.packers.com/news/packers-first-wore-green-jerseys-in-1935',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: 'packers-1923-throwback-1923',
      slug: '1923-throwback',
      collarShield: false,
      name: '1923 Throwback',
      kind: 'throwback',
      jersey: 'navy',
      colors: { primary: '#1B2C4E', secondary: '#CC8835', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#CC8835', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1923,
          to: 1926,
          startSource:
            'https://www.packers.com/news/green-bay-packers-hall-of-fame-uniform-display-thoroughly-researched-may-14-2026',
          source:
            'https://www.packers.com/news/green-bay-packers-hall-of-fame-uniform-display-thoroughly-researched-may-14-2026',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'leather', pants: 'leather', socks: 'navy' },
      ],
    },
    {
      id: 'packers-winter-warning-2025',
      slug: 'winter-warning',
      name: 'Winter Warning',
      kind: 'alternate',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#203731', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource:
            'https://www.packers.com/news/packers-unveil-white-alternate-helmets-invite-fans-to-join-winter-warning-oct-20-2024',
          verifiedOn: '2026-10-12',
        },
      ],
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
    {
      id: 'packers-rivalries-2026',
      referencePacket: {
        classification: 'signature',
        sources: [
          {
            url: 'https://www.packers.com/photos/rivalries-the-details',
            role: 'construction and front details',
            covers: ['collar', 'wordmark', 'numerals', 'sleeves'],
          },
          {
            url: 'https://www.packers.com/news/packers-reveal-nfl-rivalries-uniforms-celebrating-team-s-unique-ownership',
            role: 'equipment and design identity',
            covers: ['helmet', 'paint', 'design identity'],
          },
        ],
        observed: [
          'Striped collar, inside-neck inscription, gold numeral edge and engraved numeral fill.',
          'Authentic interlocking GB belongs on wearer left chest.',
        ],
        approximations: [
          'Authentic interlocking chest mark and engraved numeral surface are not yet represented.',
          'Fabric and helmet paints are existing digital approximations; exact material finish is unresolved.',
          'Inside-collar label uses a substitute font; rear helmet text is outside front-view coverage.',
        ],
      },
      slug: 'rivalries-2026',
      sleeveNike: 'alabaster',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#445251', secondary: '#EBDBB2', accent: '#DAAF33' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.packers.com/news/packers-reveal-nfl-rivalries-uniforms-celebrating-team-s-unique-ownership',
          verifiedOn: '2026-10-19',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Alabaster pants',
          helmet: 'rivalries',
          pants: 'alabaster',
          pantsNike: 'green',
          socks: 'rivalries',
        },
      ],
    },
  ],
};
