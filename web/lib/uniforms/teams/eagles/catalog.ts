import type { TeamCatalog } from '../core/catalog';

export const EAGLES_CATALOG: TeamCatalog = {
  teamId: 'eagles',
  designs: [
    {
      id: 'eagles-home-1996',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'green',
      colors: { primary: '#004C54', secondary: '#A5ACAF', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1996,
          startSource:
            'https://www.philadelphiaeagles.com/video/the-right-direction-1996-season-recap',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'green',
          pants: 'white',
          pantsNike: 'black',
          socks: 'white',
        },
      ],
    },
    {
      id: 'eagles-kelly-green-1987',
      slug: 'kelly-green',
      constructionKey: 'kelly-green-original',
      name: 'Kelly Green',
      kind: 'throwback',
      jersey: 'kelly-original',
      colors: { primary: '#046A38', secondary: '#A5ACAF', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#2BB673', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1987,
          to: 1995,
          startSource:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=PHI&year=1987',
          source: 'https://www.philadelphiaeagles.com/video/the-right-direction-1996-season-recap',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'kelly', pants: 'kelly' }],
    },
    {
      id: 'eagles-kelly-green-modern-2023',
      slug: 'kelly-green-modern',
      sleeveNike: 'white',
      name: 'Kelly Green (Modern)',
      kind: 'throwback',
      jersey: 'kelly-modern',
      colors: { primary: '#046A38', secondary: '#A5ACAF', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#2BB673', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource: 'https://www.philadelphiaeagles.com/kellygreen/',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'kelly',
          pants: 'silver',
          pantsNike: 'kelly',
          socks: 'kelly-hoops',
        },
      ],
    },
    {
      id: 'eagles-away-1996',
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#004C54', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1996,
          startSource:
            'https://www.philadelphiaeagles.com/video/the-right-direction-1996-season-recap',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'green',
          pants: 'white',
          pantsNike: 'black',
          socks: 'white',
        },
        {
          key: 'green-pants',
          label: 'Green pants',
          helmet: 'green',
          pants: 'green',
          pantsNike: 'white',
          socks: 'white',
        },
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'green',
          pants: 'black',
          pantsNike: 'white',
          socks: 'white',
        },
      ],
    },
    {
      id: 'eagles-black-alt-2003',
      slug: 'black-alt',
      sleeveNike: 'white',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#004C54', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#2FA3A3', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2003,
          startSource:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=PHI&year=2003',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'black', pants: 'black', pantsNike: 'white' },
      ],
    },
  ],
};
