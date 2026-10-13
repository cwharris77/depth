import type { TeamCatalog } from '../core/catalog';

const SILVER_ACCENT = { uiAccent: '#869397', onAccent: '#0a0e1a' };

export const COWBOYS_CATALOG: TeamCatalog = {
  teamId: 'cowboys',
  designs: [
    {
      id: 'cowboys-home-1964',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#003594', secondary: '#869397', accent: '#869397' },
      legacyAccent: SILVER_ACCENT,
      periods: [
        {
          from: 1996,
          startSource:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=DAL&year=1996',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-star',
          pants: 'white',
          pantsNike: 'navy',
        },
      ],
    },
    {
      id: 'cowboys-away-1964',
      slug: 'away',
      sleeveNike: 'navy',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#003594', accent: '#869397' },
      legacyAccent: SILVER_ACCENT,
      periods: [
        {
          from: 1964,
          startSource:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=DAL&year=1964',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-star',
          pants: 'white',
          pantsNike: 'navy',
        },
      ],
    },
  ],
};
