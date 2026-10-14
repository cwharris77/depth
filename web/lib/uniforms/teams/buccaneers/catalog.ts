import type { Combination, TeamCatalog } from '../core/catalog';

const RED_ACCENT = { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' };

const flag = (key: string, label: string, pants: string, socks: string): Combination => ({
  key,
  label,
  helmet: 'pewter-flag',
  pants,
  pantsNike: 'red',
  socks,
});

export const BUCCANEERS_CATALOG: TeamCatalog = {
  teamId: 'buccaneers',
  designs: [
    {
      id: 'buccaneers-home-2020',
      slug: 'home',
      sleeveNike: 'white',
      collarShield: true,
      name: 'Home',
      kind: 'home',
      jersey: 'red',
      colors: { primary: '#D50A0A', secondary: '#34302B', accent: '#FF7900' },
      legacyAccent: RED_ACCENT,
      periods: [
        {
          from: 2020,
          startSource: 'https://www.buccaneers.com/news/bucs-new-uniforms-draw-super-bowl-era-2020',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        flag('standard', 'White pants', 'white', 'pewter'),
        flag('pewter-pants', 'Pewter pants', 'pewter', 'pewter'),
      ],
    },
    {
      id: 'buccaneers-away-2020',
      slug: 'away',
      sleeveNike: 'red',
      collarShield: true,
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#D50A0A', accent: '#34302B' },
      legacyAccent: RED_ACCENT,
      periods: [
        {
          from: 2020,
          startSource: 'https://www.buccaneers.com/news/bucs-new-uniforms-draw-super-bowl-era-2020',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        flag('standard', 'White pants', 'white', 'pewter'),
        flag('pewter-pants', 'Pewter pants', 'pewter', 'pewter'),
      ],
    },
    {
      id: 'buccaneers-creamsicle-1976',
      slug: 'creamsicle',
      sleeveNike: 'white',
      collarShield: true,
      name: 'Creamsicle',
      kind: 'throwback',
      jersey: 'creamsicle',
      colors: { primary: '#FF8200', secondary: '#C8102E', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF8200', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource:
            'https://www.buccaneers.com/news/bucs-reveal-creamsicle-uniforms-lions-oct-15',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'white',
          pants: 'white',
          pantsNike: 'crimson',
          socks: 'creamsicle',
        },
      ],
    },
    {
      id: 'buccaneers-pewter-2020',
      slug: 'pewter',
      sleeveNike: 'white',
      collarShield: true,
      name: 'All-Pewter',
      kind: 'alternate',
      jersey: 'pewter',
      colors: { primary: '#34302B', secondary: '#D50A0A', accent: '#FFFFFF' },
      legacyAccent: RED_ACCENT,
      periods: [
        {
          from: 2020,
          to: 2023,
          startSource: 'https://www.buccaneers.com/photos/bucs-new-uniforms-pictures-pewter',
          source: 'https://www.buccaneers.com/news/bucs-pewter-uniforms-unveiled-week-15-2026',
          verifiedOn: '2026-10-13',
        },
        {
          from: 2026,
          startSource: 'https://www.buccaneers.com/news/bucs-pewter-uniforms-unveiled-week-15-2026',
          verifiedOn: '2026-10-13',
        },
      ],
      combinations: [flag('standard', 'Pewter pants', 'pewter', 'pewter')],
    },
  ],
};
