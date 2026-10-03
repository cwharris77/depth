import type { TeamCatalog } from '../core/catalog';

export const LIONS_CATALOG: TeamCatalog = {
  teamId: 'lions',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'blue',
      colors: { primary: '#0076B6', secondary: '#B0B7BC', accent: '#B0B7BC' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'silver-lion', pants: 'blue', socks: 'blue' },
        {
          key: 'silver-pants',
          label: 'Silver pants',
          helmet: 'silver-lion',
          pants: 'silver',
          socks: 'blue',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'silver-lion',
          pants: 'white',
          socks: 'blue',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0076B6', accent: '#B0B7BC' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-lion',
          pants: 'silver',
          socks: 'white',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'silver-lion',
          pants: 'white',
          socks: 'white',
        },
        {
          key: 'blue-pants',
          label: 'Blue pants',
          helmet: 'silver-lion',
          pants: 'blue',
          socks: 'blue',
        },
      ],
    },
    // Lions 'Gridiron Gray' alternate. Silver-gray base, Honolulu-blue trim.
    {
      slug: 'gridiron-gray',
      name: 'Gridiron Gray',
      kind: 'alternate',
      jersey: 'gray',
      colors: { primary: '#B0B7BC', secondary: '#0076B6', accent: '#000000' },
      legacyAccent: { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      periods: [{ from: 2017, to: 2023, source: 'needs-source' }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-lion',
          pants: 'silver',
          socks: 'silver',
        },
      ],
    },
  ],
};
