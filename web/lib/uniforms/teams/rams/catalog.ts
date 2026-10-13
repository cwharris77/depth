import { referencePacket } from './references-2026';
import type { TeamCatalog } from '../core/catalog';

// Combinations are the pairings the 2025 composite shows, canonical first.
export const RAMS_CATALOG: TeamCatalog = {
  teamId: 'rams',
  designs: [
    {
      id: 'rams-home-2020',
      slug: 'home',
      sleeveNike: 'white',
      sleeveNikePlacement: 'lower',
      name: 'Home',
      kind: 'home',
      jersey: 'royal',
      colors: { primary: '#003594', secondary: '#FFA300', accent: '#FFA300' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2020,
          to: 2025,
          startSource: 'https://www.therams.com/news/los-angeles-rams-unveil-new-uniforms',
          source:
            'https://www.therams.com/news/rams-unveil-uniform-brand-refresh-ahead-of-2026-season',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'gold-pants',
          label: 'Gold pants',
          helmet: 'royal-horn',
          pants: 'gold',
          pantsNike: 'royal',
          socks: 'royal',
        },
        {
          key: 'bone-pants',
          label: 'Bone pants',
          helmet: 'royal-horn',
          pants: 'bone',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
    {
      id: 'rams-away-2020',
      slug: 'away',
      sleeveNike: 'royal',
      sleeveNikePlacement: 'lower',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#003594', accent: '#FFA300' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2021,
          to: 2025,
          startSource:
            'https://www.therams.com/news/rams-unveil-2021-alternate-jersey-iconic-throwback',
          source:
            'https://www.therams.com/news/rams-unveil-uniform-brand-refresh-ahead-of-2026-season',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'royal-pants',
          label: 'Royal pants',
          helmet: 'royal-horn',
          pants: 'royal',
          pantsNike: 'white',
          socks: 'royal',
        },
        {
          key: 'gold-pants',
          label: 'Gold pants',
          helmet: 'royal-horn',
          pants: 'gold',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
    {
      id: 'rams-rivalries-2025-2025',
      slug: 'rivalries-2025',
      sleeveNike: 'white',
      sleeveNikePlacement: 'middle',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries',
      colors: { primary: '#0D1B3E', secondary: '#FFD100', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2025,
          startSource:
            'https://www.therams.com/news/rams-unveil-new-midnight-mode-uniform-as-part-of-nfl-nike-s-rivalries-program-connecting-athletes-fans-like-never-before',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'navy-horn',
          pants: 'navy',
          pantsNike: 'white',
          socks: 'navy',
        },
      ],
    },
    {
      id: 'rams-bone-2020',
      slug: 'bone',
      sleeveNike: 'royal',
      name: 'Bone',
      kind: 'alternate',
      jersey: 'bone',
      colors: { primary: '#F0EBE0', secondary: '#003594', accent: '#FFA300' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2020,
          to: 2025,
          startSource: 'https://www.therams.com/news/los-angeles-rams-unveil-new-uniforms',
          source:
            'https://www.therams.com/news/rams-unveil-uniform-brand-refresh-ahead-of-2026-season',
          verifiedOn: '2026-10-13',
        },
      ],
      combinations: [
        {
          key: 'bone-pants',
          label: 'Bone pants',
          helmet: 'royal-horn',
          pants: 'bone',
          pantsNike: 'royal',
          socks: 'bone',
        },
      ],
    },
    {
      id: 'rams-home-2026-2026',
      slug: 'home-2026',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'royal-2026',
      colors: { primary: '#003594', secondary: '#FFD100', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.therams.com/news/rams-unveil-uniform-brand-refresh-ahead-of-2026-season',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'royal-2026',
          pants: 'sol-2026',
          pantsNike: 'royal',
          socks: 'royal',
        },
      ],
    },
    {
      id: 'rams-away-2026-2026',
      slug: 'away-2026',
      sleeveNike: 'royal',
      name: 'Away',
      kind: 'away',
      jersey: 'white-2026',
      colors: { primary: '#FFFFFF', secondary: '#003594', accent: '#FFD100' },
      legacyAccent: { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.therams.com/news/rams-unveil-uniform-brand-refresh-ahead-of-2026-season',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'royal-2026',
          pants: 'white-2026',
          pantsNike: 'royal',
          socks: 'white',
        },
      ],
    },
  ],
};
