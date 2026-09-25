import { NEEDS_SOURCE, type TeamCatalog } from '../core/catalog';

export const BRONCOS_CATALOG: TeamCatalog = {
  teamId: 'broncos',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'orange',
      colors: { primary: '#FB4F14', secondary: '#002244', accent: '#002244' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-horse',
          pants: 'orange',
          socks: 'white',
        },
        {
          key: 'navy-socks',
          label: 'Navy socks',
          helmet: 'navy-horse',
          pants: 'orange',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#FB4F14', accent: '#002244' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-horse',
          pants: 'white',
          socks: 'white',
        },
        {
          key: 'navy-socks',
          label: 'Navy socks',
          helmet: 'navy-horse',
          pants: 'white',
          socks: 'navy',
        },
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'navy-horse',
          pants: 'navy',
          socks: 'navy',
        },
        {
          key: 'navy-pants-white-socks',
          label: 'Navy pants, white socks',
          helmet: 'navy-horse',
          pants: 'navy',
          socks: 'white',
        },
        {
          key: 'orange-pants',
          label: 'Orange pants',
          helmet: 'navy-horse',
          pants: 'orange',
          socks: 'white',
        },
      ],
    },
    // Orange base, navy trim: the home jersey over white pants.
    {
      slug: 'orange-alt',
      name: 'Orange Alternate',
      kind: 'alternate',
      jersey: 'orange',
      colors: { primary: '#FB4F14', secondary: '#002244', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      periods: [{ from: 2024 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy-horse', pants: 'white', socks: 'navy' },
        {
          key: 'orange-socks',
          label: 'Orange socks',
          helmet: 'navy-horse',
          pants: 'white',
          socks: 'orange',
        },
        {
          key: 'white-socks',
          label: 'White socks',
          helmet: 'navy-horse',
          pants: 'white',
          socks: 'white',
        },
      ],
    },
    // The 1968–1996 royal-blue era. The royal #001489 is too dark for the UI, so uiAccent is the
    // era's orange.
    {
      slug: 'orange-crush',
      name: 'Orange Crush',
      kind: 'throwback',
      jersey: 'crush',
      colors: { primary: '#001489', secondary: '#FA4616', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FA4616', onAccent: '#0a0e1a' },
      periods: [{ from: 1968, to: 1996, source: NEEDS_SOURCE }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'royal-d', pants: 'white', socks: 'crush' },
      ],
    },
  ],
};
