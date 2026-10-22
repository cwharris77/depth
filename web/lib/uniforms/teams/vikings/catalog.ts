import { type TeamCatalog } from '../core/catalog';

const legacyAccent = { uiAccent: '#FFC62F', onAccent: '#0a0e1a' };

export const VIKINGS_CATALOG: TeamCatalog = {
  teamId: 'vikings',
  designs: [
    {
      id: 'vikings-home-2013',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'purple',
      colors: { primary: '#4F2683', secondary: '#FFC62F', accent: '#FFC62F' },
      legacyAccent,
      periods: [
        {
          from: 2013,
          startSource:
            'https://www.nfl.com/news/miami-dolphins-minnesota-vikings-unveil-new-uniforms-0ap1000000163369',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Purple pants',
          helmet: 'purple',
          pants: 'purpleWhite',
          pantsNike: 'white',
          socks: 'purple',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'purple',
          pants: 'white',
          pantsNike: 'purple',
          socks: 'purple',
        },
      ],
    },
    {
      id: 'vikings-away-2013',
      slug: 'away',
      sleeveNike: 'purple',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#4F2683', accent: '#FFC62F' },
      legacyAccent,
      periods: [
        {
          from: 2013,
          startSource:
            'https://www.nfl.com/news/miami-dolphins-minnesota-vikings-unveil-new-uniforms-0ap1000000163369',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Purple pants',
          helmet: 'purple',
          pants: 'purpleGold',
          pantsNike: 'white',
          socks: 'white',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'purple',
          pants: 'white',
          pantsNike: 'purple',
          socks: 'white',
        },
      ],
    },
    {
      id: 'vikings-winter-warrior-2024',
      referencePacket: {
        classification: 'signature',
        sources: [
          {
            url: 'https://www.vikings.com/winter-warrior',
            role: 'construction and front details',
            covers: ['collar', 'wordmark', 'numerals', 'sleeves'],
          },
          {
            url: 'https://www.vikings.com/photos/winter-warrior-white-helmets-practice-2024',
            role: 'equipment and design identity',
            covers: ['helmet', 'paint', 'design identity'],
          },
        ],
        observed: [
          'White helmet with white horn outlined purple; metallic gray cage.',
          'Metallic gray front wordmark; purple numerals with gray edge and SKOL icicle detail.',
        ],
        approximations: [
          'Exact SKOL lettering and authentic icicle numeral geometry remain unrepresented.',
          'Helmet crown stripe, rear Nordic knot and material finishes are unresolved.',
        ],
      },
      slug: 'winter-warrior',
      sleeveNike: 'purple',
      name: 'Winter Warrior',
      kind: 'alternate',
      jersey: 'winter-white',
      colors: { primary: '#FFFFFF', secondary: '#4F2683', accent: '#FFC62F' },
      legacyAccent,
      periods: [
        {
          from: 2024,
          startSource: 'https://www.vikings.com/winter-warrior',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white',
          pants: 'winterWhite',
          pantsNike: 'purple',
          socks: 'white',
        },
      ],
    },
  ],
};
