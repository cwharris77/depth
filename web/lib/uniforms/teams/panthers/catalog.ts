import type { TeamCatalog } from '../core/catalog';

// Pairings are the 2025 composite's regular-season figures, canonical first. Its preseason-only
// group is left out.
export const PANTHERS_CATALOG: TeamCatalog = {
  teamId: 'panthers',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'blue',
      colors: { primary: '#0085CA', secondary: '#101820', accent: '#101820' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [{ from: 2012 }],
      combinations: [
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'black',
          pants: 'black',
          socks: 'black',
        },
        { key: 'blue-pants', label: 'Blue pants', helmet: 'black', pants: 'blue', socks: 'blue' },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0085CA', accent: '#101820' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [{ from: 2012 }],
      combinations: [
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'silver',
          pants: 'black',
          socks: 'black',
        },
        {
          key: 'white-pants-black-socks',
          label: 'White pants, black socks',
          helmet: 'black',
          pants: 'white',
          socks: 'black',
        },
        {
          key: 'white-pants-blue-socks',
          label: 'White pants, blue socks',
          helmet: 'silver',
          pants: 'white',
          socks: 'blue',
        },
        {
          key: 'blue-pants-white-socks',
          label: 'Blue pants, white socks',
          helmet: 'silver',
          pants: 'blue',
          socks: 'white',
        },
        {
          key: 'blue-pants-blue-socks',
          label: 'Blue pants, blue socks',
          helmet: 'silver',
          pants: 'blue',
          socks: 'blue',
        },
        {
          key: 'silver-pants',
          label: 'Silver pants',
          helmet: 'silver',
          pants: 'silver',
          socks: 'white',
        },
      ],
    },
    {
      slug: 'black-alt',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#101820', secondary: '#0085CA', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [{ from: 2012 }],
      combinations: [
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'silver',
          pants: 'black',
          socks: 'black',
        },
        {
          key: 'black-helmet',
          label: 'Black helmet',
          helmet: 'black',
          pants: 'black',
          socks: 'black',
        },
        {
          key: 'silver-pants',
          label: 'Silver pants',
          helmet: 'silver',
          pants: 'silver',
          socks: 'black',
        },
      ],
    },
  ],
};
