import { NEEDS_SOURCE, type TeamCatalog } from '../core/catalog';

export const FALCONS_CATALOG: TeamCatalog = {
  teamId: 'falcons',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#A71930', secondary: '#000000', accent: '#000000' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [{ from: 2020 }],
      combinations: [
        {
          key: 'standard',
          label: 'Black pants',
          helmet: 'black-falcon',
          pants: 'black',
          pantsNike: 'white',
          socks: 'black',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'black-falcon',
          pants: 'white',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#A71930', accent: '#A71930' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [{ from: 2020 }],
      combinations: [
        {
          key: 'standard',
          label: 'Black pants',
          helmet: 'black-falcon',
          pants: 'black',
          pantsNike: 'white',
          socks: 'black',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'black-falcon',
          pants: 'white',
          pantsNike: 'black',
          socks: 'white',
        },
      ],
    },
    {
      slug: 'red-alt',
      name: 'Red Alternate',
      kind: 'alternate',
      jersey: 'red',
      colors: { primary: '#A71930', secondary: '#000000', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [{ from: 2020, to: 2022, source: NEEDS_SOURCE }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black-falcon',
          pants: 'black',
          socks: 'black',
        },
      ],
    },
  ],
};
