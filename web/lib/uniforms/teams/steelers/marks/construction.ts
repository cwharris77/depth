// Pittsburgh's own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  STEELERS_DECAL_BLUE_PATH,
  STEELERS_DECAL_DISC_PATH,
  STEELERS_DECAL_GOLD_PATH,
  STEELERS_DECAL_RED_PATH,
  STEELERS_DECAL_RING_PATH,
  STEELERS_DECAL_SEPARATOR_PATH,
  STEELERS_DECAL_WORDMARK_PATH,
} from './decal';
import { placed } from '../../core/marks';
import type { PartLayer } from '../../core/parts';

type Surface = PartLayer['surface'];

const fill = (id: string, surface: Surface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The mark paints its white disc, grey ring, the gold, red and blue hypocycloids, the white
// separator, then the wordmark.
export const STEELERS_DECAL = placed([
  fill('steelers-decal-disc', 'helmet', STEELERS_DECAL_DISC_PATH, 'decalDisc'),
  fill('steelers-decal-ring', 'helmet', STEELERS_DECAL_RING_PATH, 'decalRing'),
  fill('steelers-decal-gold', 'helmet', STEELERS_DECAL_GOLD_PATH, 'decalGold'),
  fill('steelers-decal-red', 'helmet', STEELERS_DECAL_RED_PATH, 'decalRed'),
  fill('steelers-decal-blue', 'helmet', STEELERS_DECAL_BLUE_PATH, 'decalBlue'),
  fill('steelers-decal-separator', 'helmet', STEELERS_DECAL_SEPARATOR_PATH, 'decalSeparator'),
  fill('steelers-decal-wordmark', 'helmet', STEELERS_DECAL_WORDMARK_PATH, 'decalWordmark'),
]);

// One sleeve, outer edge at `x0` and inner edge at `x1`: a black backing whose separators show
// between the bands, then a gold band, a white band and a broad gold band. Identical on both
// sleeves.
const sleeveBands = (side: 'left' | 'right', x0: number, x1: number): PartLayer[] => {
  const surface: Surface = side === 'left' ? 'sleeve-left' : 'sleeve-right';
  const band = (name: string, y0: number, y1: number, color: string) =>
    fill(`steelers-sleeve-${name}-${side}`, surface, `M${x0},${y0} H${x1} V${y1} H${x0} Z`, color);
  return [
    band('backing', 470, 551, 'black'),
    band('gold-upper', 473, 486, 'gold'),
    band('white', 491, 500, 'white'),
    band('gold-lower', 506, 548, 'gold'),
  ];
};

// The layers are ordered by band across both sleeves, the order the archive has always painted.
const sleeveLeft = sleeveBands('left', 30, 96);
const sleeveRight = sleeveBands('right', 492, 558);
export const STEELERS_SLEEVE_STRIPES = placed(
  sleeveLeft.flatMap((layer, i) => [layer, sleeveRight[i]])
);

// The 1934 panel: a black torso block under a black chevron stroked from shoulder to shoulder,
// with five gold pinstripes down the block.
const PINSTRIPE_XS = [180, 236, 293, 346, 402];
export const STEELERS_BUMBLEBEE_PANEL = placed([
  fill('steelers-bumblebee-torso', 'jersey', 'M158,505 H433 V806 H158 Z', 'black'),
  {
    id: 'steelers-bumblebee-chevron',
    surface: 'jersey',
    d: 'M111,408 L294,548 L477,408',
    clip: true,
    kind: 'stroke',
    stroke: 'black',
    strokeWidth: 56,
  },
  ...PINSTRIPE_XS.map((x, i) =>
    fill(`steelers-bumblebee-pinstripe-${i}`, 'jersey', `M${x},505 H${x + 6} V806 H${x} Z`, 'gold')
  ),
]);
