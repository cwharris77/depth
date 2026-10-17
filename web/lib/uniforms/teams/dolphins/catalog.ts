import type { TeamCatalog } from '../core/catalog';

const AQUA_ACCENT = { uiAccent: '#2DD4D4', onAccent: '#0a0e1a' };

export const DOLPHINS_CATALOG: TeamCatalog = {
  teamId: 'dolphins',
  designs: [
    {
      id: 'dolphins-home-2018',
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'teal',
      colors: { primary: '#008E97', secondary: '#FC4C02', accent: '#FC4C02' },
      legacyAccent: AQUA_ACCENT,
      periods: [
        {
          from: 2018,
          startSource: 'https://www.miamidolphins.com/news/uniforms-historically-modern',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: 'dolphins-away-2018',
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#008E97', accent: '#FC4C02' },
      legacyAccent: AQUA_ACCENT,
      periods: [
        {
          from: 2018,
          startSource: 'https://www.miamidolphins.com/news/uniforms-historically-modern',
          verifiedOn: '2026-10-12',
        },
      ],
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
      id: 'dolphins-rivalries-2025-2025',
      slug: 'rivalries-2025',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'navy',
      colors: { primary: '#101820', secondary: '#008E97', accent: '#FC4C02' },
      legacyAccent: AQUA_ACCENT,
      periods: [
        {
          from: 2025,
          startSource: 'https://www.miamidolphins.com/rivalries/',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy', pants: 'navy', pantsNike: 'white' },
      ],
    },
    {
      id: 'dolphins-1972-throwback-1966',
      slug: '1972-throwback',
      sleeveNike: 'white',
      name: '1972 Throwback',
      kind: 'throwback',
      jersey: '1972',
      colors: { primary: '#008E97', secondary: '#FC4C02', accent: '#FFFFFF' },
      legacyAccent: AQUA_ACCENT,
      periods: [
        {
          from: 2015,
          startSource:
            'https://static.clubs.nfl.com/image/upload/v1578436728/patriots/jszl7spp94f7gytw3xge.pdf',
          verifiedOn: '2026-10-12',
        },
      ],
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
