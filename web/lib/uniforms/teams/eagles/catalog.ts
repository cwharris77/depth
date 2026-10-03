import type { TeamCatalog } from '../core/catalog';

export const EAGLES_CATALOG: TeamCatalog = {
  teamId: 'eagles',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'green',
      colors: { primary: '#004C54', secondary: '#A5ACAF', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
      periods: [{ from: 1996 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'green', pants: 'white', socks: 'white' },
      ],
    },
    {
      slug: 'kelly-green',
      constructionKey: 'kelly-green-original',
      name: 'Kelly Green',
      kind: 'throwback',
      jersey: 'kelly-original',
      colors: { primary: '#046A38', secondary: '#A5ACAF', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#2BB673', onAccent: '#0a0e1a' },
      periods: [{ from: 1987 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'kelly', pants: 'kelly' }],
    },
    {
      slug: 'kelly-green-modern',
      name: 'Kelly Green (Modern)',
      kind: 'throwback',
      jersey: 'kelly-modern',
      colors: { primary: '#046A38', secondary: '#A5ACAF', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#2BB673', onAccent: '#0a0e1a' },
      periods: [{ from: 2023 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'kelly',
          pants: 'silver',
          socks: 'kelly-hoops',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#004C54', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
      periods: [{ from: 1996 }],
      combinations: [
        { key: 'standard', label: 'White pants', helmet: 'green', pants: 'white', socks: 'white' },
        {
          key: 'green-pants',
          label: 'Green pants',
          helmet: 'green',
          pants: 'green',
          socks: 'white',
        },
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'green',
          pants: 'black',
          socks: 'white',
        },
      ],
    },
    {
      slug: 'black-alt',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#004C54', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
      periods: [{ from: 2003 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'black', pants: 'black' }],
    },
  ],
};
