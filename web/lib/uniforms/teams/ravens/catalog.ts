import type { TeamCatalog } from '../core/catalog';

export const RAVENS_CATALOG: TeamCatalog = {
  teamId: 'ravens',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'purple',
      colors: { primary: '#241773', secondary: '#000000', accent: '#9E7C0C' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [{ from: 1996 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'black', pants: 'purple' }],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#241773', accent: '#9E7C0C' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [{ from: 1996 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'black', pants: 'purple' }],
    },
    {
      slug: 'black-alt',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#241773', accent: '#9E7C0C' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [{ from: 2004 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'black', pants: 'purple' }],
    },
  ],
};
