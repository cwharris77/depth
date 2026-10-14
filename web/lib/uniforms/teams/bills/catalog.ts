import type { TeamCatalog } from '../core/catalog';

const legacyAccent = { uiAccent: '#5B9BFF', onAccent: '#0a0e1a' };

export const BILLS_CATALOG: TeamCatalog = {
  teamId: 'bills',
  designs: [
    {
      id: 'bills-home-2011',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'blue',
      colors: { primary: '#00338D', secondary: '#C60C30', accent: '#C60C30' },
      legacyAccent,
      periods: [
        {
          from: 2011,
          startSource:
            'https://www.buffalobills.com/photos/photos-buffalo-bills-uniforms-through-the-years',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Royal pants',
          helmet: 'white',
          pants: 'blue',
          pantsNike: 'white',
          socks: 'navy',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
    {
      id: 'bills-away-2011',
      slug: 'away',
      sleeveNike: 'navy',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#00338D', accent: '#C60C30' },
      legacyAccent,
      periods: [
        {
          from: 2011,
          startSource:
            'https://www.buffalobills.com/photos/photos-buffalo-bills-uniforms-through-the-years',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'navy',
          socks: 'navy',
        },
        {
          key: 'royal-pants',
          label: 'Royal pants',
          helmet: 'white',
          pants: 'blue',
          pantsNike: 'white',
          socks: 'navy',
        },
      ],
    },
    {
      id: 'bills-rivalries-2025-2025',
      slug: 'rivalries-2025',
      sleeveNike: 'rivalriesNumber',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#FFFFFF', secondary: '#00338D', accent: '#C60C30' },
      legacyAccent,
      periods: [
        {
          from: 2025,
          startSource: 'https://www.buffalobills.com/fans/rivalries-uniform',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'ice',
          pants: 'rivalries',
          pantsNike: 'navy',
          socks: 'white',
        },
      ],
    },
    {
      id: 'bills-nickel-city-2026',
      slug: 'nickel-city',
      sleeveNike: 'white',
      name: 'Nickel City',
      kind: 'alternate',
      jersey: 'nickel-city',
      colors: { primary: '#949399', secondary: '#00338D', accent: '#C60C30' },
      legacyAccent,
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.buffalobills.com/news/buffalo-bills-unveil-new-nickel-city-uniforms-leading-into-the-inaugural-season-of-highmark-stadium',
          verifiedOn: '2026-10-13',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Gray pants',
          helmet: 'charge',
          pants: 'nickel-city',
          pantsNike: 'white',
          socks: 'navy',
        },
      ],
    },
  ],
};
