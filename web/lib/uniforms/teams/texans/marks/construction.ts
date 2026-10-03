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

// Sleeve marks are drawn for the right sleeve, outer edge at x=100.
export const TEXANS_AWAY_SLEEVE_SWOOSH: Mark<'navy' | 'red'> = {
  box: [0, 0, 100, 130],
  paths: [
    {
      slot: 'navy',
      d: 'M0,0 C44,6 78,16 100,34 L100,130 C62,114 24,76 0,0 Z',
    },
    {
      slot: 'red',
      d: 'M40,92 C58,100 78,102 100,100 L100,114 C76,116 54,110 36,98 Z',
    },
  ],
};

export const TEXANS_BATTLE_RED_SLEEVE_SWOOSH: Mark<'navy'> = {
  box: [0, 0, 100, 130],
  paths: [
    {
      slot: 'navy',
      d: 'M0,0 C44,6 78,16 100,34 L100,130 L60,130 Q50,124 48,114 Q38,110 34,100 Q26,96 22,86 Q12,80 8,68 Q2,50 1,34 Q1,16 0,0 Z',
    },
  ],
};

export const TEXANS_HOME_SLEEVE_HORN: Mark<'red'> = {
  box: [0, 0, 100, 100],
  paths: [
    {
      slot: 'red',
      d: 'M18,10 C46,12 70,28 80,52 C85,66 86,80 80,94 C70,76 56,64 40,48 C34,40 26,28 18,10 Z',
    },
  ],
};
