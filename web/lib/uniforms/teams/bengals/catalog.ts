import { NEEDS_SOURCE, type Combination, type TeamCatalog } from '../core/catalog';

const ACCENT = { uiAccent: '#FF6A33', onAccent: '#0a0e1a' };

const orangeHelmet = (key: string, label: string, pants: string, socks: string): Combination => ({
  key,
  label,
  helmet: 'orange',
  pants,
  socks,
});

export const BENGALS_CATALOG: TeamCatalog = {
  teamId: 'bengals',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#FB4F14', secondary: '#000000', accent: '#000000' },
      legacyAccent: ACCENT,
      periods: [{ from: 2021 }],
      combinations: [
        orangeHelmet('standard', 'Black pants, black socks', 'black', 'black'),
        orangeHelmet('black-orange-socks', 'Black pants, orange socks', 'black', 'orange'),
        orangeHelmet('white-pants', 'White pants, orange socks', 'white', 'orange'),
        orangeHelmet('orange-pants', 'Orange pants, black socks', 'orange', 'black'),
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#FB4F14', accent: '#FB4F14' },
      legacyAccent: ACCENT,
      periods: [{ from: 2021 }],
      combinations: [
        orangeHelmet('standard', 'White pants, black socks', 'white', 'black'),
        orangeHelmet('white-out', 'White pants, white socks', 'white', 'white'),
        orangeHelmet('black-pants', 'Black pants, white socks', 'black', 'white'),
        orangeHelmet('orange-pants', 'Orange pants, white socks', 'orange', 'white'),
      ],
    },
    {
      slug: 'orange-alt',
      name: 'Orange Alternate',
      kind: 'alternate',
      jersey: 'orange',
      colors: { primary: '#FB4F14', secondary: '#000000', accent: '#FFFFFF' },
      legacyAccent: ACCENT,
      periods: [{ from: 2021 }],
      combinations: [orangeHelmet('standard', 'White pants, orange socks', 'white', 'orange')],
    },
    {
      slug: 'color-rush',
      name: 'Color Rush',
      kind: 'color-rush',
      jersey: 'color-rush',
      colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#000000' },
      legacyAccent: ACCENT,
      periods: [{ from: 2016, to: 2022, source: NEEDS_SOURCE }],
      combinations: [orangeHelmet('standard', 'White pants, white socks', 'white-claws', 'white')],
    },
  ],
};
