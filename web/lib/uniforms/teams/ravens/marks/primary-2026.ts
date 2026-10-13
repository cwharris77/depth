import { placed, placeMark, ANCHORS, type Mark } from '../../core/marks';
import { HELMET_CROWN_STRIPE_PATH } from '../../core/shared';
import { RAVENS_HELMET_DECAL } from './construction';
import {
  RAVENS_2026_WORDMARK,
  BALTIMORE_2026_WORDMARK,
  SHIELD_B_2026,
  SHIELD_R_2026,
} from './wordmarks-2026';

export const RAVENS_2026_HELMET = placed([
  ...RAVENS_HELMET_DECAL.layers,
  {
    id: 'ravens-2026-crown',
    surface: 'helmet',
    kind: 'fill',
    fill: 'purple',
    d: HELMET_CROWN_STRIPE_PATH,
    clip: true,
  },
]);

export const RAVENS_2026_WINGS = placed([
  {
    id: 'ravens-2026-wing-left',
    surface: 'collar',
    kind: 'fill',
    fill: 'midnight',
    clip: true,
    d: 'M202,380 L232,385 L264,414 L211,391 Z M211,395 L246,409 L277,432 L219,406 Z M222,415 L262,432 L287,450 L237,431 Z M241,438 L275,449 L291,461 L260,449 Z',
  },
  {
    id: 'ravens-2026-wing-right',
    surface: 'collar',
    kind: 'fill',
    fill: 'midnight',
    clip: true,
    d: 'M386,380 L356,385 L324,414 L377,391 Z M377,395 L342,409 L311,432 L369,406 Z M366,415 L326,432 L301,450 L351,431 Z M347,438 L313,449 L297,461 L328,449 Z',
  },
]);

const shield: Mark = {
  box: [0, 0, 100, 106],
  paths: [
    { slot: 'gold', d: 'M0,0 H100 V50 Q100,85 50,106 Q0,85 0,50 Z' },
    { slot: 'midnight', d: 'M5,5 H95 V50 Q95,81 50,100 Q5,81 5,50 Z' },
    { slot: 'gold', d: 'M9,9 H49 V49 H9 Z M51,51 H91 Q88,75 51,96 Z' },
    { slot: 'white', d: 'M51,9 H91 V49 H51 Z M9,51 H49 V96 Q12,75 9,51 Z' },
    {
      slot: 'black',
      d: 'M9,51 H29 V69 H9 Z M29,69 H49 V88 H29 Z M51,51 H71 V69 H51 Z M71,69 H91 V88 H71 Z',
    },
    { slot: 'black', d: SHIELD_B_2026 },
    { slot: 'red', d: SHIELD_R_2026 },
  ],
};
const rightShield = placeMark('ravens-2026-shield', shield, 'sleeve-right', {
  gold: 'gold',
  midnight: 'midnight',
  white: 'white',
  black: 'black',
  red: 'red',
});
const shieldOffset = ANCHORS['sleeve-left'].x0 - ANCHORS['sleeve-right'].x0;
// Heraldic lettering keeps its reading direction on both sleeves.
export const RAVENS_2026_SHIELDS = placed(
  rightShield.flatMap((layer) => [
    {
      ...layer,
      id: layer.id.replace('-right', '-left'),
      surface: 'sleeve-left' as const,
      d: layer.d.replace(/(-?\d+\.\d+),/g, (_, x) => `${(Number(x) + shieldOffset).toFixed(1)},`),
    },
    layer,
  ])
);

export const RAVENS_2026_HOME_WORDMARK = placed([
  {
    id: 'ravens-2026-home-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'white',
    d: RAVENS_2026_WORDMARK,
    clip: true,
  },
]);
export const RAVENS_2026_AWAY_WORDMARK = placed([
  {
    id: 'ravens-2026-away-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'black',
    d: BALTIMORE_2026_WORDMARK,
    clip: true,
  },
]);

export const RAVENS_2026_TALONS = placed([
  {
    id: 'ravens-2026-talon-left',
    surface: 'leg-left',
    kind: 'fill',
    fill: 'midnight',
    d: 'M118,807 H134 V1157 L118,1196 Z',
    clip: true,
  },
  {
    id: 'ravens-2026-talon-right',
    surface: 'leg-right',
    kind: 'fill',
    fill: 'midnight',
    d: 'M454,807 H470 V1196 L454,1157 Z',
    clip: true,
  },
  {
    id: 'ravens-2026-talon-inset-left',
    surface: 'leg-left',
    kind: 'fill',
    fill: 'black',
    d: 'M124,807 H129 V1170 L124,1182 Z',
    clip: true,
  },
  {
    id: 'ravens-2026-talon-inset-right',
    surface: 'leg-right',
    kind: 'fill',
    fill: 'black',
    d: 'M459,807 H464 V1182 L459,1170 Z',
    clip: true,
  },
]);
