import type { Combination, TeamCatalog } from '../core/catalog';

const BLUE_ACCENT = { uiAccent: '#36A7E0', onAccent: '#0a0e1a' };
const GOLD_ACCENT = { uiAccent: '#FFC20E', onAccent: '#0a0e1a' };

const white = (key: string, label: string, pants: string, socks: string): Combination => ({
  key,
  label,
  helmet: 'white',
  pants,
  pantsNike: pants === 'powder' ? 'white' : 'powderBlue',
  socks,
});

// The four pairings worn with a powder-blue jersey.
const POWDER_COMBINATIONS: Combination[] = [
  white('standard', 'Gold pants', 'gold', 'powder'),
  white('white-pants', 'White pants', 'white', 'powder'),
  white('powder-pants', 'Powder pants, white socks', 'powder', 'white'),
  white('powder-out', 'Powder pants, powder socks', 'powder', 'powder'),
];

export const CHARGERS_CATALOG: TeamCatalog = {
  teamId: 'chargers',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'powder',
      colors: { primary: '#0080C6', secondary: '#FFC20E', accent: '#FFC20E' },
      legacyAccent: BLUE_ACCENT,
      periods: [{ from: 2020 }],
      combinations: POWDER_COMBINATIONS,
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0080C6', accent: '#FFC20E' },
      legacyAccent: BLUE_ACCENT,
      periods: [{ from: 2020 }],
      combinations: [
        ...POWDER_COMBINATIONS,
        white('white-out', 'White pants, white socks', 'white', 'white'),
      ],
    },
    // The AFL powder blue, worn as a current alternate: the home jersey's construction.
    {
      slug: 'powder-blue',
      name: 'Powder Blue',
      kind: 'alternate',
      jersey: 'powder',
      colors: { primary: '#0080C6', secondary: '#FFC20E', accent: '#FFFFFF' },
      legacyAccent: BLUE_ACCENT,
      periods: [{ from: 1960 }],
      combinations: [white('standard', 'Gold pants', 'gold', 'powder')],
    },
    {
      slug: 'charger-power',
      name: 'Charger Power',
      kind: 'alternate',
      jersey: 'gold',
      colors: { primary: '#FFC20E', secondary: '#0080C6', accent: '#FFFFFF' },
      legacyAccent: GOLD_ACCENT,
      periods: [{ from: 2025 }],
      combinations: [white('standard', 'Gold pants', 'gold', 'gold')],
    },
    {
      slug: 'super-chargers',
      name: 'Super Chargers',
      kind: 'alternate',
      jersey: 'navy',
      colors: { primary: '#002244', secondary: '#FFC20E', accent: '#FFFFFF' },
      legacyAccent: GOLD_ACCENT,
      periods: [{ from: 2025 }],
      combinations: [
        {
          key: 'standard',
          label: 'Navy pants',
          helmet: 'navy',
          pants: 'navy',
          pantsNike: 'gold',
          socks: 'navy',
        },
      ],
    },
  ],
};
