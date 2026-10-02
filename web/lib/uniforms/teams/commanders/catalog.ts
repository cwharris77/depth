import type { TeamCatalog } from '../core/catalog';

export const COMMANDERS_CATALOG: TeamCatalog = {
  teamId: 'commanders',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'burgundy',
      colors: { primary: '#5A1414', secondary: '#FFB612', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 2022 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'burgundy', pants: 'burgundy' }],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#5A1414', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 2022 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'burgundy', pants: 'white' }],
    },
    {
      slug: '70s-burgundy',
      name: '70s Burgundy',
      kind: 'throwback',
      jersey: 'burgundy',
      colors: { primary: '#5A1414', secondary: '#FFB612', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FFB612', onAccent: '#0a0e1a' },
      periods: [{ from: 1972 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'burgundy', pants: 'burgundy' }],
    },
  ],
};
