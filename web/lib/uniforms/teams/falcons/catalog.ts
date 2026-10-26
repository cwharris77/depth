import { referencePacket } from './references-2026';
import { type TeamCatalog } from '../core/catalog';

export const FALCONS_CATALOG: TeamCatalog = {
  teamId: 'falcons',
  designs: [
    {
      id: 'falcons-home-2020',
      slug: 'home',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'black',
      colors: { primary: '#000000', secondary: '#A71930', accent: '#A71930' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2020,
          to: 2025,
          startSource:
            'https://www.atlantafalcons.com/news/atlanta-falcons-go-back-to-black-unveil-new-uniforms',
          source:
            'https://www.atlantafalcons.com/news/authentic-fast-timeless-atlanta-falcons-unveil-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Black pants',
          helmet: 'black-falcon',
          pants: 'black',
          pantsNike: 'white',
          socks: 'black',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'black-falcon',
          pants: 'white',
          pantsNike: 'black',
          socks: 'black',
        },
      ],
    },
    {
      id: 'falcons-away-2020',
      slug: 'away',
      sleeveNike: 'black',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#A71930', accent: '#A71930' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2020,
          to: 2025,
          startSource:
            'https://www.atlantafalcons.com/news/atlanta-falcons-go-back-to-black-unveil-new-uniforms',
          source:
            'https://www.atlantafalcons.com/news/authentic-fast-timeless-atlanta-falcons-unveil-new-uniforms',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Black pants',
          helmet: 'black-falcon',
          pants: 'black',
          pantsNike: 'white',
          socks: 'black',
        },
        {
          key: 'white-pants',
          label: 'White pants',
          helmet: 'black-falcon',
          pants: 'white',
          pantsNike: 'black',
          socks: 'white',
        },
      ],
    },
    {
      id: 'falcons-red-alt-2020',
      slug: 'red-alt',
      name: 'Red Alternate',
      kind: 'alternate',
      jersey: 'red',
      colors: { primary: '#A71930', secondary: '#000000', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2020,
          to: 2022,
          startSource:
            'https://www.atlantafalcons.com/photos/best-of-the-gradient-uniforms-best-of-2020',
          source:
            'https://news.sportslogos.net/2023/05/23/arthur-smith-reveals-atlanta-falcons-wont-wear-gradient-alternate-uniforms-in-2023/football/',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'black-falcon',
          pants: 'black',
          socks: 'black',
        },
      ],
    },
    {
      id: 'falcons-home-2026-2026',
      slug: 'home-2026',
      sleeveNike: 'white',
      name: 'Home',
      kind: 'home',
      jersey: 'red-2026',
      colors: { primary: '#A71930', secondary: '#FFFFFF', accent: '#000000' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.atlantafalcons.com/news/authentic-fast-timeless-atlanta-falcons-unveil-new-uniforms',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'black-falcon',
          pants: 'white-2026',
          pantsNike: 'red',
          socks: 'red',
        },
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'black-falcon',
          pants: 'black-2026',
          pantsNike: 'white',
          socks: 'black',
        },
        {
          key: 'white-socks',
          label: 'White pants, white socks',
          helmet: 'black-falcon',
          pants: 'white-2026',
          pantsNike: 'red',
          socks: 'white',
        },
      ],
    },
    {
      id: 'falcons-away-2026-2026',
      slug: 'away-2026',
      sleeveNike: 'red',
      name: 'Away',
      kind: 'away',
      jersey: 'white-2026',
      colors: { primary: '#FFFFFF', secondary: '#A71930', accent: '#000000' },
      legacyAccent: { uiAccent: '#FF4D5E', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2026,
          startSource:
            'https://www.atlantafalcons.com/news/authentic-fast-timeless-atlanta-falcons-unveil-new-uniforms',
          verifiedOn: '2026-10-13',
        },
      ],
      referencePacket,
      combinations: [
        {
          key: 'standard',
          label: 'White pants',
          helmet: 'black-falcon',
          pants: 'white-2026',
          pantsNike: 'red',
          socks: 'white',
        },
        {
          key: 'black-pants',
          label: 'Black pants',
          helmet: 'black-falcon',
          pants: 'black-2026',
          pantsNike: 'white',
          socks: 'white',
        },
      ],
    },
  ],
};
