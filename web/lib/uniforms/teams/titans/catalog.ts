import type { TeamCatalog } from '../core/catalog';

const legacyAccent = { uiAccent: '#5BA8E8', onAccent: '#0a0e1a' };
const primaryChangeSource =
  'https://www.tennesseetitans.com/news/titans-switching-to-titans-blue-as-primary-home-jersey-color-in-2025';
const newUniformSource =
  'https://www.tennesseetitans.com/news/titans-unveil-new-uniforms-logo-to-represent-the-next-chapter-of-franchise-history';
const oilersSource = 'https://www.tennesseetitans.com/history/logo-history';

export const TITANS_CATALOG: TeamCatalog = {
  teamId: 'titans',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#0C2340', secondary: '#4B92DB', accent: '#4B92DB' },
      legacyAccent,
      periods: [{ from: 2018, to: 2024, source: primaryChangeSource }],
      combinations: [
        { key: 'standard', label: 'Navy pants', helmet: 'navy-t', pants: 'navy', socks: 'navy' },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'navy-t',
          pants: 'white',
          socks: 'navy',
        },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#0C2340', accent: '#4B92DB' },
      legacyAccent,
      periods: [{ from: 2018, to: 2025, source: newUniformSource }],
      combinations: [
        { key: 'standard', label: 'White pants', helmet: 'navy-t', pants: 'white', socks: 'white' },
        { key: 'navy-pants', label: 'Navy pants', helmet: 'navy-t', pants: 'navy', socks: 'white' },
      ],
    },
    {
      slug: 'oilers-throwback',
      name: '1960 Oilers',
      kind: 'throwback',
      jersey: 'light-blue',
      colors: { primary: '#4B92DB', secondary: '#C8102E', accent: '#FFFFFF' },
      legacyAccent,
      periods: [{ from: 1960, to: 1960, source: oilersSource }],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'oilers',
          pants: 'oilers',
          socks: 'oilers',
        },
      ],
    },
    {
      slug: 'navy-alt',
      name: 'Navy Alternate',
      kind: 'alternate',
      jersey: 'navy-alt',
      colors: { primary: '#0C2340', secondary: '#4B92DB', accent: '#C8102E' },
      legacyAccent,
      periods: [{ from: 2018, to: 2025, source: newUniformSource }],
      combinations: [
        { key: 'standard', label: 'Navy pants', helmet: 'navy-t', pants: 'navy', socks: 'navy' },
      ],
    },
    {
      slug: 'titans-blue-home',
      name: 'Titans Blue Home',
      kind: 'home',
      jersey: 'blue-2025',
      colors: { primary: '#4B92DB', secondary: '#0C2340', accent: '#FFFFFF' },
      legacyAccent,
      periods: [{ from: 2025, to: 2025, source: newUniformSource }],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'navy-t',
          pants: 'white',
          socks: 'lightBlue',
        },
      ],
    },
    {
      slug: 'home-2026',
      name: 'Home',
      kind: 'home',
      jersey: 'blue-2026',
      colors: { primary: '#4495D2', secondary: '#FFFFFF', accent: '#D50A0A' },
      legacyAccent,
      periods: [{ from: 2026 }],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'white-2026',
          pants: 'white-2026',
          socks: 'lightBlue2026',
        },
      ],
    },
    {
      slug: 'away-2026',
      name: 'Away',
      kind: 'away',
      jersey: 'white-2026',
      colors: { primary: '#FFFFFF', secondary: '#4495D2', accent: '#D50A0A' },
      legacyAccent,
      periods: [{ from: 2026 }],
      combinations: [
        {
          key: 'standard',
          label: 'Titans Blue pants',
          helmet: 'white-2026',
          pants: 'blue-2026',
          socks: 'white',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'white-2026',
          pants: 'white-2026',
          socks: 'white',
        },
      ],
    },
  ],
};
