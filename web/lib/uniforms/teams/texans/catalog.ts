import type { TeamCatalog } from '../core/catalog';

export const TEXANS_CATALOG: TeamCatalog = {
  teamId: 'texans',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#03202F', secondary: '#A71930', accent: '#A71930' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'navy-bull',
          pants: 'white',
          socks: 'navy',
        },
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'navy-bull',
          pants: 'navy',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#03202F', accent: '#A71930' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        { key: 'standard', label: 'Navy pants', helmet: 'navy-bull', pants: 'navy', socks: 'navy' },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'navy-bull',
          pants: 'white',
          socks: 'white',
        },
      ],
    },
    {
      slug: 'battle-red',
      name: 'Battle Red',
      kind: 'alternate',
      jersey: 'red',
      colors: { primary: '#A71930', secondary: '#03202F', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'red-horn', pants: 'red', socks: 'red' },
      ],
    },
  ],
};
