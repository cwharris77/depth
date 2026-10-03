import type { TeamCatalog } from '../core/catalog';

export const JAGUARS_CATALOG: TeamCatalog = {
  teamId: 'jaguars',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'teal',
      colors: { primary: '#006778', secondary: '#D7A22A', accent: '#D7A22A' },
      legacyAccent: { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
      periods: [{ from: 2018 }],
      combinations: [
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'black',
          pants: 'white',
          socks: 'white',
        },
        { key: 'teal-pants', label: 'Teal pants', helmet: 'black', pants: 'teal', socks: 'white' },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#006778', accent: '#D7A22A' },
      legacyAccent: { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
      periods: [{ from: 2018 }],
      combinations: [
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'black',
          pants: 'white',
          socks: 'white',
        },
        { key: 'teal-pants', label: 'Teal pants', helmet: 'black', pants: 'teal', socks: 'white' },
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'black',
          pants: 'black',
          socks: 'white',
        },
      ],
    },
    {
      slug: 'teal-throwback',
      name: 'Prowler Throwback',
      kind: 'throwback',
      jersey: 'throwback',
      colors: { primary: '#006778', secondary: '#D7A22A', accent: '#101820' },
      legacyAccent: { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
      periods: [{ from: 1998 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black-bare',
          pants: 'throwback',
          socks: 'black',
        },
      ],
    },
    {
      slug: 'black-alt',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black-alt',
      colors: { primary: '#101820', secondary: '#D7A22A', accent: '#006778' },
      legacyAccent: { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' },
      periods: [{ from: 2018 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'black', pants: 'black', socks: 'black' },
      ],
    },
  ],
};
