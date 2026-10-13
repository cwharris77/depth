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
      id: 'vikings-purple-classic-1961',
      slug: 'purple-classic',
      name: 'Purple Classic',
      kind: 'throwback',
      jersey: 'purple-classic',
      colors: { primary: '#4F2683', secondary: '#FFC62F', accent: '#FFFFFF' },
      legacyAccent,
      periods: [
        {
          from: 1961,
          to: 1969,
          startSource:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=MIN&year=1961',
          source:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=MIN&year=1970',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'classic', pants: 'white', socks: 'purple' },
      ],
    },
    {
      id: 'vikings-winter-warrior-2024',
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
