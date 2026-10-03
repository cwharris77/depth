import type { TeamCatalog } from '../core/catalog';

export const CARDINALS_CATALOG: TeamCatalog = {
  teamId: 'cardinals',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#97233F', secondary: '#000000', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
      periods: [{ from: 2023 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'white', pants: 'red', socks: 'red' },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#97233F', accent: '#FFB612' },
      legacyAccent: { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
      periods: [{ from: 2023 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'white', pants: 'white', socks: 'white' },
      ],
    },
    {
      slug: 'rivalries-2025',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#FFF7E3', secondary: '#B31529', accent: '#EE6B3D' },
      legacyAccent: { uiAccent: '#EE6B3D', onAccent: '#0a0e1a' },
      periods: [{ from: 2025 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'cream', pants: 'cream', socks: 'rivalries' },
      ],
    },
    {
      slug: 'black-alt',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#97233F', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF4D6A', onAccent: '#0a0e1a' },
      periods: [{ from: 2023 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'black', pants: 'black', socks: 'black' },
      ],
    },
  ],
};
