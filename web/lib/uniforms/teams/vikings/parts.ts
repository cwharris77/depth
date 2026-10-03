import type { TeamSpec } from '../core/team-spec';
import { vikingsHorn } from './marks/construction';
import { VIKINGS_JERSEY_PURPLE } from './jerseys/purple';
import { VIKINGS_JERSEY_PURPLE_CLASSIC } from './jerseys/purple-classic';
import { VIKINGS_JERSEY_WHITE } from './jerseys/white';
import { VIKINGS_JERSEY_WINTER_WHITE } from './jerseys/winter-white';

export const VIKINGS_PALETTE = {
  purple: '#4F2683',
  gold: '#FFC62F',
  white: '#FFFFFF',
  black: '#000000',
  metallicGray: '#A7A9AC',
};

export const VIKINGS_SPEC: TeamSpec = {
  helmets: {
    purple: {
      shell: 'purple',
      facemask: 'black',
      decal: vikingsHorn('white', 'gold'),
      number: 'none',
    },
    classic: {
      shell: 'purple',
      facemask: 'metallicGray',
      decal: vikingsHorn('white', 'gold'),
      number: 'none',
    },
    white: {
      shell: 'white',
      facemask: 'metallicGray',
      decal: vikingsHorn('purple', 'metallicGray'),
      number: 'none',
    },
  },
  jerseys: {
    purple: VIKINGS_JERSEY_PURPLE,
    white: VIKINGS_JERSEY_WHITE,
    'purple-classic': VIKINGS_JERSEY_PURPLE_CLASSIC,
    'winter-white': VIKINGS_JERSEY_WINTER_WHITE,
  },
  pants: {
    purpleWhite: {
      body: 'purple',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'white', size: 'm' },
          { color: 'gold', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    purpleGold: {
      body: 'purple',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'gold', size: 'm' },
          { color: 'white', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    white: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'purple', size: 'm' },
          { color: 'gold', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
    winterWhite: {
      body: 'white',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'metallicGray', size: 's' },
          { color: 'purple', size: 's' },
        ],
        gap: 'none',
        edge: 'none',
      },
      marks: [],
    },
  },
  socks: {
    purple: { color: 'purple', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
  },
};
