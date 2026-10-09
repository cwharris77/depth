import type { Combination, TeamCatalog } from '../core/catalog';

const RED_ACCENT = { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' };

const flag = (key: string, label: string, pants: string, socks: string): Combination => ({
  key,
  label,
  helmet: 'pewter-flag',
  pants,
  pantsNike: 'red',
  socks,
});

export const BUCCANEERS_CATALOG: TeamCatalog = {
  teamId: 'buccaneers',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#D50A0A', secondary: '#34302B', accent: '#FF7900' },
      legacyAccent: RED_ACCENT,
      periods: [{ from: 2020 }],
      combinations: [
        flag('standard', 'White pants', 'white', 'pewter'),
        flag('pewter-pants', 'Pewter pants', 'pewter', 'pewter'),
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#D50A0A', accent: '#34302B' },
      legacyAccent: RED_ACCENT,
      periods: [{ from: 2020 }],
      combinations: [
        flag('standard', 'White pants', 'white', 'pewter'),
        flag('pewter-pants', 'Pewter pants', 'pewter', 'pewter'),
      ],
    },
    {
      slug: 'creamsicle',
      name: 'Creamsicle',
      kind: 'throwback',
      jersey: 'creamsicle',
      colors: { primary: '#FF8200', secondary: '#C8102E', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF8200', onAccent: '#0a0e1a' },
      periods: [{ from: 1976 }],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'crimson',
          socks: 'creamsicle',
        },
      ],
    },
  ],
};
