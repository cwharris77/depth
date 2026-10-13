import { referencePacket } from './references-2026';
import type { TeamCatalog } from '../core/catalog';

export const RAVENS_CATALOG: TeamCatalog = {
  teamId: 'ravens',
  designs: [
    {
      id: 'ravens-home-1996',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'purple',
      colors: { primary: '#241773', secondary: '#000000', accent: '#9E7C0C' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2000,
          to: 2025,
          startSource:
            'https://www.baltimoreravens.com/photos/ravens-new-uniforms-history-jerseys-combinations-photos',
          source:
            'https://www.baltimoreravens.com/news/ravens-new-uniforms-unveiled-process-brad-downs-sashi-brown-kenico-hines-josh-lukin',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black',
          pants: 'purple',
          pantsNike: 'white',
        },
      ],
    },
    {
      id: 'ravens-away-1996',
      slug: 'away',
      sleeveNike: 'purple',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#241773', accent: '#9E7C0C' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2000,
          to: 2025,
          startSource:
            'https://www.baltimoreravens.com/photos/ravens-new-uniforms-history-jerseys-combinations-photos',
          source:
            'https://www.baltimoreravens.com/news/ravens-new-uniforms-unveiled-process-brad-downs-sashi-brown-kenico-hines-josh-lukin',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black',
          pants: 'purple',
          pantsNike: 'white',
        },
      ],
    },
    {
      id: 'ravens-black-alt-2004',
      slug: 'black-alt',
      sleeveNike: 'white',
      name: 'Black Alternate',
      kind: 'alternate',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#241773', accent: '#9E7C0C' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2004,
          to: 2025,
          startSource:
            'https://www.baltimoreravens.com/photos/ravens-new-uniforms-history-jerseys-combinations-photos',
          source:
            'https://www.baltimoreravens.com/news/ravens-new-uniforms-unveiled-process-brad-downs-sashi-brown-kenico-hines-josh-lukin',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black',
          pants: 'purple',
          pantsNike: 'white',
        },
      ],
    },
    {
      id: 'ravens-home-2026-2026',
      slug: 'home-2026',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'purple-2026',
      colors: { primary: '#241773', secondary: '#FFFFFF', accent: '#4B327A' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.baltimoreravens.com/news/baltimore-ravens-unveil-new-uniforms-press-release',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black-2026',
          pants: 'white-2026',
          pantsNike: 'purple',
          socks: 'white',
        },
      ],
    },
    {
      id: 'ravens-away-2026-2026',
      slug: 'away-2026',
      sleeveNike: 'purple',
      name: 'Away',
      kind: 'away',
      jersey: 'white-2026',
      colors: { primary: '#FFFFFF', secondary: '#241773', accent: '#4B327A' },
      legacyAccent: { uiAccent: '#9E7C0C', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.baltimoreravens.com/news/baltimore-ravens-unveil-new-uniforms-press-release',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black-2026',
          pants: 'purple-2026',
          pantsNike: 'white',
          socks: 'white',
        },
      ],
    },
  ],
};
