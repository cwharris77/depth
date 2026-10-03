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

// The away and Battle Red sleeve stripe rises into a horn at the front of the shoulder.
export const TEXANS_SLEEVE_HORN: Mark<'edge' | 'horn'> = {
  box: [0, 0, 100, 70],
  paths: [
    {
      slot: 'edge',
      d: 'M0,61 L0,47 C19,43 33,27 47,0 C52,20 69,30 100,35 L100,53 C74,48 58,41 47,29 C32,49 18,59 0,67 Z',
    },
    {
      slot: 'horn',
      d: 'M0,56 L0,49 C21,45 35,28 47,8 C54,27 69,34 100,39 L100,49 C75,45 57,37 47,23 C33,45 17,56 0,62 Z',
    },
  ],
};
