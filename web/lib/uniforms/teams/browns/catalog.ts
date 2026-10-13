import type { TeamCatalog } from '../core/catalog';

const legacyAccent = { uiAccent: '#FF6A33', onAccent: '#0a0e1a' };

export const BROWNS_CATALOG: TeamCatalog = {
  teamId: 'browns',
  designs: [
    {
      id: 'browns-home-2020',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'brown',
      colors: { primary: '#311D00', secondary: '#FF3C00', accent: '#FF3C00' },
      legacyAccent,
      periods: [
        {
          from: 2020,
          startSource:
            'https://www.clevelandbrowns.com/news/browns-pay-homage-to-past-look-ahead-to-future-with-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'orange',
          pants: 'white',
          pantsNike: 'brown',
          socks: 'brown',
        },
        {
          key: 'orange-pants',
          label: 'Orange pants',
          helmet: 'orange',
          pants: 'orange',
          pantsNike: 'brown',
          socks: 'brown',
        },
        {
          key: 'brown-pants',
          label: 'Brown pants',
          helmet: 'orange',
          pants: 'brown',
          pantsNike: 'white',
          socks: 'brown',
        },
      ],
    },
    {
      id: 'browns-away-2020',
      slug: 'away',
      sleeveNike: 'brown',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#311D00', accent: '#FF3C00' },
      legacyAccent,
      periods: [
        {
          from: 2020,
          startSource:
            'https://www.clevelandbrowns.com/news/browns-pay-homage-to-past-look-ahead-to-future-with-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'orange',
          pants: 'white',
          pantsNike: 'brown',
          socks: 'white',
        },
        {
          key: 'orange-pants',
          label: 'Orange pants',
          helmet: 'orange',
          pants: 'orange',
          pantsNike: 'brown',
          socks: 'white',
        },
      ],
    },
    {
      id: 'browns-1946-throwback-1946',
      slug: '1946-throwback',
      sleeveNike: 'brown',
      name: '1946 Throwback',
      kind: 'throwback',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#FF3C00', accent: '#311D00' },
      legacyAccent,
      periods: [
        {
          from: 2021,
          startSource: 'https://www.clevelandbrowns.com/news/75uniform-launch',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'brown',
          pants: '1946-white',
          pantsNike: 'brown',
          socks: '1946-white',
        },
      ],
    },
  ],
};
