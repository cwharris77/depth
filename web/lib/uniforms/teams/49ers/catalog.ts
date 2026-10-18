import type { TeamCatalog } from '../core/catalog';

export const NINERS_CATALOG: TeamCatalog = {
  teamId: '49ers',
  designs: [
    {
      id: '49ers-home-2022',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#AA0000', secondary: '#B3995D', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2022,
          startSource:
            'https://www.49ers.com/news/49ers-unveil-classic-updates-to-standard-home-and-away-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold',
          pants: 'gold',
          pantsNike: 'red',
          socks: 'red',
        },
      ],
    },
    {
      id: '49ers-away-2022',
      slug: 'away',
      sleeveNike: 'red',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#AA0000', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2022,
          startSource:
            'https://www.49ers.com/news/49ers-unveil-classic-updates-to-standard-home-and-away-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'gold',
          pants: 'gold',
          pantsNike: 'red',
          socks: 'red',
        },
        {
          key: 'white-socks',
          label: 'White socks',
          helmet: 'gold',
          pants: 'gold',
          pantsNike: 'red',
          socks: 'white',
        },
      ],
    },
    {
      id: '49ers-rivalries-2025-2025',
      referencePacket: {
        classification: 'signature',
        sources: [
          {
            url: 'https://www.49ers.com/photos/behind-the-scenes-of-the-san-francisco-49ers-rivalry-shoot',
            role: 'official detail photographs',
            covers: ['helmet', 'chest wordmark', 'numerals', 'shoulders', 'sleeves'],
          },
          {
            url: 'https://www.49ers.com/news/49ers-unveil-new-rivalries-uniforms-for-2025-season',
            role: 'official release',
            covers: ['helmet', 'jersey', 'pants', 'colors'],
          },
        ],
        observed: [
          'Black shell, jersey and pants; red stripes; gold sleeve swoosh; red numerals with gold borders; Faithful chest script.',
        ],
        approximations: [
          'Flat palette gold approximates reflective trim; the chest script and numeral are approximated with outlined fonts.',
        ],
      },
      slug: 'rivalries-2025',
      sleeveNike: 'gold',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#101820', secondary: '#B3995D', accent: '#AA0000' },
      legacyAccent: { uiAccent: '#B3995D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2025,
          startSource:
            'https://www.49ers.com/news/rivalries-night-paints-levis-stadium-black-49ers',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black',
          pants: 'black',
          pantsNike: 'white',
          socks: 'red',
        },
      ],
    },
    {
      id: '49ers-white-throwback-2018',
      slug: 'white-throwback',
      sleeveNike: 'red',
      name: 'White Throwback',
      kind: 'throwback',
      jersey: 'throwback-white',
      colors: { primary: '#FFFFFF', secondary: '#AA0000', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2018,
          startSource:
            'https://www.49ers.com/news/49ers-unveil-alternate-throwback-uniforms-at-annual-state-of-the-franchise-event',
          verifiedOn: '2026-10-17',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'throwback-gold',
          pants: 'white',
          pantsNike: 'red',
          socks: 'white',
        },
      ],
    },
    {
      id: '49ers-red-throwback-2021',
      slug: 'red-throwback',
      sleeveNike: 'white',
      name: 'Red Throwback',
      kind: 'throwback',
      jersey: 'throwback-red',
      colors: { primary: '#AA0000', secondary: '#FFFFFF', accent: '#B3995D' },
      legacyAccent: { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2021,
          startSource:
            'https://www.49ers.com/photos/49ers-unveil-94-red-throwbacks-75th-anniversary-first-look',
          verifiedOn: '2026-10-17',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'throwback-gold',
          pants: 'white',
          pantsNike: 'red',
          socks: 'red',
        },
      ],
    },
  ],
};
