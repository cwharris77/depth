import type { TeamCatalog } from '../core/catalog';

export const LIONS_CATALOG: TeamCatalog = {
  teamId: 'lions',
  designs: [
    {
      id: 'lions-home-2024',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'blue',
      colors: { primary: '#0264AE', secondary: '#A3A6AA', accent: '#A3A6AA' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource: 'https://www.detroitlions.com/news/detroit-lions-unveil-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-lion',
          pants: 'blue',
          pantsNike: 'blue',
          socks: 'blue',
        },
        {
          key: 'silver-pants',
          label: 'Silver pants',
          helmet: 'silver-lion',
          pants: 'silver-striped',
          pantsNike: 'blue',
          socks: 'blue',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'silver-lion',
          pants: 'white',
          pantsNike: 'blue',
          socks: 'blue',
        },
      ],
    },
    {
      id: 'lions-away-2024',
      slug: 'away',
      sleeveNike: 'blue',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0264AE', accent: '#A3A6AA' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource: 'https://www.detroitlions.com/news/detroit-lions-unveil-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-lion',
          pants: 'silver-striped',
          pantsNike: 'blue',
          socks: 'white',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'silver-lion',
          pants: 'white',
          pantsNike: 'blue',
          socks: 'white',
        },
        {
          key: 'blue-pants',
          label: 'Blue pants',
          helmet: 'silver-lion',
          pants: 'blue',
          pantsNike: 'blue',
          socks: 'blue',
        },
      ],
    },
    // Lions 'Gridiron Gray' alternate. Silver-gray base, Honolulu-blue trim.
    {
      id: 'lions-gridiron-gray-2017',
      sleeveNike: 'white',
      slug: 'gridiron-gray',
      name: 'Gridiron Gray',
      kind: 'alternate',
      jersey: 'gray',
      colors: { primary: '#545859', secondary: '#0264AE', accent: '#000000' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2017,
          to: 2023,
          startSource: 'https://www.detroitlions.com/photos/detroit-lions-2017-uniforms-18737602',
          source: 'https://static.www.nfl.com/league/apps/league-site/media-guides/2025/DET.pdf',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-2017',
          pants: 'darkSteel',
          socks: 'darkSteel',
        },
      ],
    },
    {
      id: 'lions-black-alternate-2024',
      referencePacket: {
        classification: 'detail',
        sources: [
          {
            url: 'https://www.detroitlions.com/photos/2024-detroit-lions-uniform-reveal-alternate',
            role: 'construction and front details',
            covers: ['collar', 'wordmark', 'numerals', 'sleeves'],
          },
          {
            url: 'https://www.detroitlions.com/news/detroit-lions-unveil-new-uniforms',
            role: 'equipment and design identity',
            covers: ['helmet', 'paint', 'design identity'],
          },
        ],
        observed: [
          'Black exterior collar, blue inside-back trim, LIONS chest lettering.',
          'Blue helmet with black lion, silver accents and black cage.',
        ],
        approximations: [
          'Chest/inside-neck lettering is a font substitute.',
          'Helmet material and sleeve-band wrap are simplified.',
        ],
      },
      slug: 'black-alternate',
      sleeveNike: 'silver',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#0264AE', accent: '#A3A6AA' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource: 'https://uniforms.detroitlions.com/p/1',
          verifiedOn: '2026-10-19',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Black pants',
          helmet: 'black-lion',
          pants: 'black',
          pantsNike: 'silver',
          socks: 'black',
        },
        {
          key: 'blue-pants',
          label: 'Honolulu Blue pants',
          helmet: 'black-lion',
          pants: 'blue',
          pantsNike: 'silver',
          socks: 'blue',
        },
      ],
    },
    {
      id: 'lions-honolulu-blue-classic-2024',
      referencePacket: {
        classification: 'detail',
        sources: [
          {
            url: 'https://www.detroitlions.com/news/detroit-lions-unveil-new-uniforms',
            role: 'construction and front details',
            covers: ['collar', 'wordmark', 'numerals', 'sleeves'],
          },
          {
            url: 'https://www.gridiron-uniforms.com/GUD/images/singles/2025_DET_F.png',
            role: 'equipment and design identity',
            covers: ['helmet', 'paint', 'design identity'],
          },
        ],
        observed: ['Bare silver helmet, silver numerals without outline, plain silver pants.'],
        approximations: ['Exact numeral font and helmet material remain simplified.'],
      },
      slug: 'honolulu-blue-classic',
      sleeveNike: 'silver',
      name: 'Honolulu Blue Classic',
      kind: 'throwback',
      jersey: 'classic',
      colors: { primary: '#0264AE', secondary: '#A3A6AA', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2024,
          startSource: 'https://uniforms.detroitlions.com/p/1',
          verifiedOn: '2026-10-19',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Silver pants',
          helmet: 'silver-classic',
          pants: 'silver',
          pantsNike: 'blue',
          socks: 'blue',
        },
      ],
    },
  ],
};
