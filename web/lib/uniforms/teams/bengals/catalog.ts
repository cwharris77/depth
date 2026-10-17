import { type Combination, type TeamCatalog } from '../core/catalog';

const ACCENT = { uiAccent: '#FF6A33', onAccent: '#0a0e1a' };

const orangeHelmet = (key: string, label: string, pants: string, socks: string): Combination => ({
  key,
  label,
  helmet: 'orange',
  pants,
  pantsNike: pants === 'black' ? 'white' : 'black',
  socks,
});

export const BENGALS_CATALOG: TeamCatalog = {
  teamId: 'bengals',
  designs: [
    {
      id: 'bengals-home-2021',
      slug: 'home',
      sleeveNike: 'white',
      sleeveNikePlacement: 'lower',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#FB4F14', accent: '#FFFFFF' },
      legacyAccent: ACCENT,
      periods: [
        {
          from: 2021,
          startSource: 'https://www.bengals.com/news/bengals-new-stripes-bold-sleek-iconic',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        orangeHelmet('standard', 'Black pants, black socks', 'black', 'black'),
        orangeHelmet('black-orange-socks', 'Black pants, orange socks', 'black', 'orange'),
        orangeHelmet('white-pants', 'White pants, orange socks', 'white', 'orange'),
        orangeHelmet('orange-pants', 'Orange pants, black socks', 'orange', 'black'),
      ],
    },
    {
      id: 'bengals-away-2021',
      slug: 'away',
      sleeveNike: 'orange',
      sleeveNikePlacement: 'lower',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#FB4F14', accent: '#FB4F14' },
      legacyAccent: ACCENT,
      periods: [
        {
          from: 2021,
          startSource: 'https://www.bengals.com/news/bengals-new-stripes-bold-sleek-iconic',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        orangeHelmet('standard', 'White pants, black socks', 'white', 'black'),
        orangeHelmet('white-out', 'White pants, white socks', 'white', 'white'),
        orangeHelmet('black-pants', 'Black pants, white socks', 'black', 'white'),
        orangeHelmet('orange-pants', 'Orange pants, white socks', 'orange', 'white'),
      ],
    },
    {
      id: 'bengals-orange-alt-2021',
      slug: 'orange-alt',
      sleeveNike: 'white',
      sleeveNikePlacement: 'lower',
      name: 'Orange Alternate',
      kind: 'alternate',
      jersey: 'orange',
      colors: { primary: '#FB4F14', secondary: '#000000', accent: '#FFFFFF' },
      legacyAccent: ACCENT,
      periods: [
        {
          from: 2021,
          startSource: 'https://www.bengals.com/news/bengals-new-stripes-bold-sleek-iconic',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [orangeHelmet('standard', 'White pants, orange socks', 'white', 'orange')],
    },
    {
      id: 'bengals-color-rush-2016',
      slug: 'color-rush',
      sleeveNike: 'orange',
      sleeveNikePlacement: 'lower',
      name: 'Color Rush',
      kind: 'color-rush',
      jersey: 'color-rush',
      colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#000000' },
      legacyAccent: ACCENT,
      periods: [
        {
          from: 2016,
          to: 2022,
          startSource:
            'https://www.bengals.com/news/white-bengal-thursday-night-football-miami-dolphins-amazon-prime-2022',
          source: 'https://static.clubs.nfl.com/image/upload/bengals/qdvwps1zkvelvpqrpygg',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          ...orangeHelmet('standard', 'White pants, white socks', 'white-claws', 'white'),
          pantsNike: undefined,
        },
      ],
    },
  ],
};
