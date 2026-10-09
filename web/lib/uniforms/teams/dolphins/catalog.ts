import type { TeamCatalog } from '../core/catalog';

const AQUA_ACCENT = { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' };

export const DOLPHINS_CATALOG: TeamCatalog = {
  teamId: 'dolphins',
  designs: [
    {
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'teal',
      colors: { primary: '#008E97', secondary: '#FC4C02', accent: '#FC4C02' },
      legacyAccent: AQUA_ACCENT,
      periods: [{ from: 2018 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'teal',
          socks: 'teal',
        },
      ],
    },
    {
      slug: 'away',
      sleeveNike: 'teal',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#008E97', accent: '#FC4C02' },
      legacyAccent: AQUA_ACCENT,
      periods: [{ from: 2018 }],
      combinations: [
        {
          key: 'standard',
          label: 'Teal pants',
          helmet: 'white',
          pants: 'teal',
          pantsNike: 'white',
          socks: 'teal',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'teal',
        },
      ],
    },
    {
      slug: 'rivalries-2025',
      sleeveNike: 'teal',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'navy',
      colors: { primary: '#101820', secondary: '#008E97', accent: '#FC4C02' },
      legacyAccent: AQUA_ACCENT,
      periods: [{ from: 2025 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy', pants: 'navy', pantsNike: 'white' },
      ],
    },
    {
      slug: '1972-throwback',
      sleeveNike: 'white',
      name: '1972 Throwback',
      kind: 'throwback',
      jersey: '1972',
      colors: { primary: '#008E97', secondary: '#FC4C02', accent: '#FFFFFF' },
      legacyAccent: AQUA_ACCENT,
      periods: [{ from: 1966 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'white1972',
          pants: 'white1972',
          pantsNike: 'teal',
        },
      ],
    },
  ],
};
