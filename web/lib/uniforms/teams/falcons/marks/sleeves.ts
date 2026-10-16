import { boundsOf, placed, placeMarkOnPair, type Mark } from '../../core/marks';
import { FALCONS_DECAL } from './construction';

// The same layered falcon as the helmet, wrapped around the outer face of each arm.
const [x0, y0, x1, y1] = boundsOf(FALCONS_DECAL.layers[0].d);
const sleeveLogo: Mark = {
  box: [x0, y0, x1 + 0.2 * (x1 - x0), y1],
  paths: FALCONS_DECAL.layers.map((layer) => ({
    slot: layer.kind === 'fill' ? layer.fill : layer.stroke,
    d: layer.d,
  })),
};

export const FALCONS_SLEEVE_LOGOS = placed(
  placeMarkOnPair('falcons-sleeve', sleeveLogo, 'sleeve-wraps', {
    black: 'black',
    white: 'white',
    red: 'red',
    silver: 'silver',
  })
);
