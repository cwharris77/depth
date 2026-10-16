// Jacksonville's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import { JAGUARS_DECAL_PATHS } from './decal';
import { modernInsetVCollar } from '../../core/shared';
import { JAGUARS_PROWLER } from './prowler';
import { JAGUARS_THROWBACK_NUMBER_THREE } from './numbers';
import { boundsOf, placeMark, placeMarkOnPair, placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

// The jaguar head in the supplied artwork's paint order, including its black keyline and gold
// shading. Each fill is its own palette key.
export const JAGUARS_HELMET_DECAL = placed(
  JAGUARS_DECAL_PATHS.map(({ d, fill }, index): PartLayer => ({
    id: `jaguars-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }))
);

// The sleeve band follows the arm opening, including the inner corner at the torso.
export const JAGUARS_CUFF = (color: string) =>
  placed([
    {
      id: 'jaguars-cuff-left',
      surface: 'sleeve-left',
      clip: true,
      kind: 'fill',
      fill: color,
      d: 'M30,540 L61,540 L140,557 L140,591 L30,591 Z',
    },
    {
      id: 'jaguars-cuff-right',
      surface: 'sleeve-right',
      clip: true,
      kind: 'fill',
      fill: color,
      d: 'M558,540 L527,540 L448,557 L448,591 L558,591 Z',
    },
    {
      id: 'jaguars-cuff-edge-left',
      surface: 'sleeve-left',
      clip: true,
      kind: 'stroke',
      stroke: 'outline',
      strokeWidth: 3,
      d: 'M30,563 L140,563',
    },
    {
      id: 'jaguars-cuff-edge-right',
      surface: 'sleeve-right',
      clip: true,
      kind: 'stroke',
      stroke: 'outline',
      strokeWidth: 3,
      d: 'M558,563 L448,563',
    },
  ]);

// The colour at the sides stops above the V point; the front and placket match the body.
export const JAGUARS_MODERN_COLLAR = (body: string, edge: string) => {
  const layers = modernInsetVCollar({
    idPrefix: 'jaguars',
    colors: { interior: body, edge: body, inset: body, placket: body, backBar: body },
    outline: true,
  });
  const side = 'M205,383 C199,414 207,435 238,455 C219,430 215,412 222,383 Z';
  let i = 0;
  const mirror = side.replace(/-?\d+(?:\.\d+)?/g, (v) =>
    i++ % 2 === 0 ? String(588 - Number(v)) : v
  );
  layers.splice(
    5,
    0,
    {
      id: 'jaguars-neck-edge-left',
      surface: 'collar',
      clip: true,
      kind: 'fill',
      fill: edge,
      d: side,
    },
    {
      id: 'jaguars-neck-edge-right',
      surface: 'collar',
      clip: true,
      kind: 'fill',
      fill: edge,
      d: mirror,
    }
  );
  return placed(layers);
};

// The short gold block ends before the black hem reaches the torso.
export const JAGUARS_THROWBACK_BLOCKS = placed([
  {
    id: 'jaguars-block-left',
    surface: 'sleeve-left',
    clip: true,
    kind: 'fill',
    fill: 'throwbackGold',
    d: 'M30,541 H96 V569 H30 Z',
  },
  {
    id: 'jaguars-block-right',
    surface: 'sleeve-right',
    clip: true,
    kind: 'fill',
    fill: 'throwbackGold',
    d: 'M558,541 H492 V569 H558 Z',
  },
]);

export const JAGUARS_THROWBACK_CUFF = placed([
  {
    id: 'jaguars-throwback-cuff-left',
    surface: 'sleeve-left',
    clip: true,
    kind: 'fill',
    fill: 'black',
    d: 'M30,569 H140 V591 H30 Z',
  },
  {
    id: 'jaguars-throwback-cuff-right',
    surface: 'sleeve-right',
    clip: true,
    kind: 'fill',
    fill: 'black',
    d: 'M558,569 H448 V591 H558 Z',
  },
]);

// A narrow black keyline surrounds the inner gold numeral outline.
export const JAGUARS_THROWBACK_NUMBER_OUTLINE = placed([
  {
    id: 'jaguars-throwback-number-outer-outline',
    surface: 'jersey',
    clip: true,
    kind: 'stroke',
    stroke: 'black',
    strokeWidth: 22,
    d: JAGUARS_THROWBACK_NUMBER_THREE,
  },
]);

// The same head as the helmet decal, scaled to the badge over the wearer's heart.
export const JAGUARS_CHEST_HEAD = placed(
  placeMark<string>(
    'jaguars-chest',
    {
      box: boundsOf(JAGUARS_DECAL_PATHS.map(({ d }) => d).join(' ')),
      paths: JAGUARS_DECAL_PATHS.map(({ d, fill }) => ({ d, slot: fill })),
    },
    'chest-left',
    Object.fromEntries(JAGUARS_DECAL_PATHS.map(({ fill }) => [fill, fill]))
  )
);

// Both running jaguars face toward the front of the jersey.
export const JAGUARS_PROWLER_SLEEVES = placed(
  placeMarkOnPair('jaguars-prowler', JAGUARS_PROWLER, 'sleeve-wraps', {
    black: 'black',
    gold: 'gold',
    white: 'white',
    teal: 'teal',
  })
);
