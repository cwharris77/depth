import type { TeamCatalog } from '../core/catalog';

// Both kits are the 2025 composite's figures: silver pants and black socks under each jersey.
export const RAIDERS_CATALOG: TeamCatalog = {
  teamId: 'raiders',
  designs: [
    {
      id: 'raiders-home-1963',
      slug: 'home',
      sleeveNike: 'silver',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#A5ACAF', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1963,
          startSource:
            'https://www.raiders.com/news/raiders-color-rush-jerseys-celebrate-1970-team-19606979',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-shield',
          pants: 'silver',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
    {
      id: 'raiders-away-1963',
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#000000', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#C8CDD6', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1965,
          to: 1969,
          startSource: 'https://nfluniforms.blogspot.com/2011/07/boys-are-back.html',
          source: 'https://www.raiders.com/news/raiders-throwback-jerseys-celebrate-1970-team',
          verifiedOn: '2026-10-13',
        },
        {
          from: 1971,
          startSource:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=RAI&year=1971',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'silver-shield',
          pants: 'silver',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
  ],
};
