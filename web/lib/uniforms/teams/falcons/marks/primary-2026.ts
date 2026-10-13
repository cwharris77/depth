import { boundsOf, placed, placeMarkOnPair, type Mark } from '../../core/marks';
import { FALCONS_DECAL } from './construction';
import { FALCONS_2026_WORDMARK, ATLANTA_2026_WORDMARK } from './wordmarks-2026';

// The box is wider than the falcon on the sleeve's outer side, so the logo sits clear of the
// sleeve's outer edge instead of being trimmed by it.
const [logoX0, logoY0, logoX1, logoY1] = boundsOf(FALCONS_DECAL.layers[0].d);
const sleeveLogo: Mark = {
  box: [logoX0, logoY0, logoX1 + 0.2 * (logoX1 - logoX0), logoY1],
  paths: FALCONS_DECAL.layers.map((layer) => ({
    slot: layer.kind === 'fill' ? layer.fill : layer.stroke,
    d: layer.d,
  })),
};

export const FALCONS_2026_SLEEVE_LOGOS = placed(
  placeMarkOnPair('falcons-2026-logo', sleeveLogo, 'sleeves', {
    black: 'black',
    white: 'white',
    red: 'red',
    silver: 'silver',
  })
);

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
