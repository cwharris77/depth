// New England's own art, bound to palette keys and emitted exactly as written: the helmet mark, the
// throwback crown stripe, the sleeve logo, the chest wordmark and the three diagonal bands down each
// shoulder cap.
import {
  PATRIOTS_BANDS_LEFT,
  PATRIOTS_BANDS_RIGHT,
  PATRIOTS_CHEST_WORDMARK_PATH,
  PATRIOTS_DECAL_FACE_PATH,
  PATRIOTS_DECAL_KEYLINE_PATH,
  PATRIOTS_DECAL_SILVER_PATH,
  PATRIOTS_DECAL_STAR_PATH,
  PATRIOTS_DECAL_STREAMERS_PATH,
} from './paths';
import { placed, type Mark, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import { seatedCrownStripe } from '../../core/shared';

type DecalSlot = 'keyline' | 'face' | 'streamers' | 'silver' | 'star';

// Keyline, face, streamers, silver trim, star: paint order keeps the white star over the face.
const DECAL_SHAPES: readonly (readonly [DecalSlot, string])[] = [
  ['keyline', PATRIOTS_DECAL_KEYLINE_PATH],
  ['face', PATRIOTS_DECAL_FACE_PATH],
  ['streamers', PATRIOTS_DECAL_STREAMERS_PATH],
  ['silver', PATRIOTS_DECAL_SILVER_PATH],
  ['star', PATRIOTS_DECAL_STAR_PATH],
];

// The helmet mark with each of its five components in the given colour.
export function patriotsHelmetDecal(colors: Record<DecalSlot, string>): PlacedMark {
  return placed(
    DECAL_SHAPES.map(([slot, d]): PartLayer => ({
      id: `patriots-decal-${slot}`,
      surface: 'helmet',
      d,
      clip: true,
      kind: 'fill',
      fill: colors[slot],
    }))
  );
}

export const PATRIOTS_HELMET_DECAL = patriotsHelmetDecal({
  keyline: 'white',
  face: 'navy',
  streamers: 'red',
  silver: 'silver',
  star: 'white',
});

// The throwback shell's red, white, blue, white, red crown stripe.
export const PATRIOTS_THROWBACK_CROWN_STRIPE = placed(
  seatedCrownStripe([
    { id: 'patriots-crown-red-top', fill: 'patRed', weight: 2 },
    { id: 'patriots-crown-white-top', fill: 'white', weight: 1 },
    { id: 'patriots-crown-blue', fill: 'rivalNavy', weight: 2 },
    { id: 'patriots-crown-white-bottom', fill: 'white', weight: 1 },
    { id: 'patriots-crown-red-bottom', fill: 'patRed', weight: 2 },
  ])
);

// The art's horizontal extent in raw helmet space: the streamers' tail to the keyline's tip.
const DECAL_X0 = 162;
const DECAL_X1 = 490;

// Reflects every x of an absolute M/L/Z polygon path about the decal's vertical centre.
function reflectDecal(d: string): string {
  return d.replace(/([ML])(-?[\d.]+),(-?[\d.]+)/g, (_, cmd: string, x: string, y: string) => {
    const reflected = Math.round((DECAL_X0 + DECAL_X1 - Number(x)) * 10) / 10;
    return `${cmd}${reflected},${y}`;
  });
}

// The helmet mark worn on the outer sleeve, its face toward the chest. Drawn for the right sleeve,
// where the art reads reflected; the sleeve pair turns it back for the left sleeve.
export const PATRIOTS_SLEEVE_LOGO: Mark<DecalSlot> = {
  box: [DECAL_X0, 128, DECAL_X1, 280],
  paths: DECAL_SHAPES.map(([slot, d]) => ({ slot, d: reflectDecal(d) })),
};

// The PATRIOTS chest wordmark in the given colour.
export function patriotsChestWordmark(fill: string): PlacedMark {
  return placed([
    {
      id: 'patriots-chest-wordmark',
      surface: 'jersey',
      d: PATRIOTS_CHEST_WORDMARK_PATH,
      clip: true,
      kind: 'fill',
      fill,
    },
  ]);
}

// Three bands per shoulder; the middle one takes the inner colour, the outer two the outer colour.
export function patriotsShoulderBands(outer: string, inner: string): PlacedMark {
  const sides = [
    ['sleeve-left', 'left', PATRIOTS_BANDS_LEFT],
    ['sleeve-right', 'right', PATRIOTS_BANDS_RIGHT],
  ] as const;
  return placed(
    sides.flatMap(([surface, side, paths]) =>
      paths.map((d, i): PartLayer => ({
        id: `patriots-band-${i}-${side}`,
        surface,
        d,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? inner : outer,
      }))
    )
  );
}
