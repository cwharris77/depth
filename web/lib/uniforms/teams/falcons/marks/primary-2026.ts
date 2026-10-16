import { placed } from '../../core/marks';
import { FALCONS_2026_WORDMARK, ATLANTA_2026_WORDMARK } from './wordmarks-2026';

export const FALCONS_2026_HOME_WORDMARK = placed([
  {
    id: 'falcons-2026-home-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'white',
    d: FALCONS_2026_WORDMARK,
    clip: true,
  },
]);
export const FALCONS_2026_AWAY_WORDMARK = placed([
  {
    id: 'falcons-2026-away-wordmark',
    surface: 'jersey',
    kind: 'fill',
    fill: 'black',
    d: ATLANTA_2026_WORDMARK,
    clip: true,
  },
]);
