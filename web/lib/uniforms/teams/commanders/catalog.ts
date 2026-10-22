import { referencePacket } from './references-2026';
import type { TeamCatalog } from '../core/catalog';

export const COMMANDERS_CATALOG: TeamCatalog = {
  teamId: 'commanders',
  designs: [
    {
      id: 'commanders-home-2022',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'burgundy',
      colors: { primary: '#5A1414', secondary: '#FFB612', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2022,
          to: 2025,
          startSource:
            'https://www.commanders.com/news/4-things-to-know-about-the-washington-commanders-new-uniforms',
          source:
            'https://www.commanders.com/news/commanders-2026-uniform-inspired-franchise-history',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'burgundy',
          pants: 'burgundy',
          pantsNike: 'white',
        },
      ],
    },
    {
      id: 'commanders-away-2022',
      slug: 'away',
      sleeveNike: 'burgundy',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#5A1414', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2022,
          to: 2025,
          startSource:
            'https://www.commanders.com/news/4-things-to-know-about-the-washington-commanders-new-uniforms',
          source:
            'https://www.commanders.com/news/commanders-2026-uniform-inspired-franchise-history',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'burgundy',
          pants: 'white',
          pantsNike: 'burgundy',
        },
      ],
    },
    {
      id: 'commanders-70s-burgundy-1972',
      slug: '70s-burgundy',
      sleeveNike: 'white',
      name: '70s Burgundy',
      kind: 'throwback',
      jersey: 'burgundy',
      colors: { primary: '#5A1414', secondary: '#FFB612', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 1972,
          to: 2019,
          startSource:
            'https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=teams-season&team_id=WAS&year=1972',
          source:
            'https://www.commanders.com/news/washington-redskins-retiring-name-logo-following-review',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'burgundy',
          pants: 'burgundy',
          pantsNike: 'white',
        },
      ],
    },
    {
      id: 'commanders-home-2026-2026',
      slug: 'home-2026',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'burgundy-2026',
      colors: { primary: '#5A1414', secondary: '#FFFFFF', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.commanders.com/news/commanders-2026-uniform-inspired-franchise-history',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'burgundy-2026',
          pants: 'white-2026',
          pantsNike: 'burgundy',
          socks: 'burgundy',
        },
      ],
    },
    {
      id: 'commanders-super-bowl-away-2025',
      slug: 'super-bowl-away',
      sleeveNike: 'burgundy',
      name: 'Away',
      kind: 'away',
      jersey: 'white-2026',
      colors: { primary: '#FFFFFF', secondary: '#5A1414', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2025,
          startSource:
            'https://www.commanders.com/news/washington-commanders-announce-new-super-bowl-era-uniforms-helmet-for-2025-season',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'burgundy-2026',
          pants: 'burgundy-2026',
          pantsNike: 'white',
          socks: 'white-hooped',
        },
      ],
    },
  ],
};
