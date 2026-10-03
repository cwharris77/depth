import { placed } from '../../core/marks';
import type { Mark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import {
  TEXANS_BATTLE_RED_DECAL_PATH,
  TEXANS_BULL_KEYLINE_WIDTH,
  TEXANS_BULL_NAVY_PATH,
  TEXANS_BULL_RED_PATH,
  TEXANS_BULL_STAR_PATH,
} from './decal';

const fill = (id: string, d: string, color: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

const keyline = (id: string, d: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'stroke',
  stroke: 'white',
  strokeWidth: TEXANS_BULL_KEYLINE_WIDTH,
});

export const TEXANS_BULL = placed([
  keyline('texans-bull-keyline-navy', TEXANS_BULL_NAVY_PATH),
  keyline('texans-bull-keyline-red', TEXANS_BULL_RED_PATH),
  fill('texans-bull-head', TEXANS_BULL_NAVY_PATH, 'decalNavy'),
  fill('texans-bull-horn', TEXANS_BULL_RED_PATH, 'decalRed'),
  fill('texans-bull-star', TEXANS_BULL_STAR_PATH, 'white'),
]);

export const TEXANS_BATTLE_RED_HORN = placed([
  fill('texans-decal-battle-red-horn', TEXANS_BATTLE_RED_DECAL_PATH, 'decalNavy'),
]);

export const TEXANS_SHOULDER_HORN: Mark<'navy' | 'red'> = {
  box: [0, 0, 200, 100],
  paths: [
    {
      slot: 'navy',
      d: 'M100,8 C75,2 55,8 39,22 C24,35 13,51 0,69 L0,100 C21,85 36,66 51,48 C66,31 82,25 100,33 Z',
    },
    {
      slot: 'red',
      d: 'M100,46 C79,35 61,39 46,51 C29,64 14,82 0,95 L0,82 C21,55 38,39 55,29 C72,20 88,22 100,30 Z',
    },
  ],
};

export const TEXANS_HOME_SLEEVE_HORN: Mark<'white' | 'red'> = {
  box: [0, 0, 100, 70],
  paths: [
    {
      slot: 'white',
      d: 'M100,2 C76,0 58,8 43,22 C26,37 13,54 0,65 L0,70 C27,61 48,46 64,30 C77,18 89,17 100,24 Z',
    },
    {
      slot: 'red',
      d: 'M100,28 C79,19 62,24 48,36 C31,50 16,65 0,70 L0,61 C22,40 39,25 55,17 C72,10 88,15 100,21 Z',
    },
  ],
};
