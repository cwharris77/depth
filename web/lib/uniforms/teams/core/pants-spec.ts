// Declarative pants and socks descriptions: palette keys and named steps, no coordinates.
// expandPants() and expandSocks() own the leg geometry, fitted once to the shared mannequin, and
// emit ordinary UniformPart layers.
import type { PartLayer, UniformPart } from './parts';
import type { JerseyBand, JerseyGap, JerseySize } from './jersey-spec';

export interface StripeStack {
  bands: JerseyBand[];
  gap: JerseyGap;
  // Pipes every band with a thin band of this colour on both sides; the gap is measured between
  // pipings.
  edge?: string;
}

export interface PantsSpec {
  body: string;
  // Stripes from the waist to the hem, listed from the outer edge of the leg inward. 'leg-edge'
  // follows the leg's outer silhouette, which is how a side-seam stripe reads from the front;
  // 'center' is a straight stack centred on the leg's seam line.
  stripes?: StripeStack & { position: 'center' | 'leg-edge' };
}

export interface SocksSpec {
  color: string;
  // Hoops around the calf, listed from the top down.
  stripes?: StripeStack;
}

// Narrower than the jersey steps: a leg stripe is a fraction of a sleeve band.
const SIZE_PX: Record<JerseySize, number> = { s: 8, m: 16, l: 24 };
const GAP_PX: Record<JerseyGap, number> = { none: 0, narrow: 4, wide: 8, broad: 12 };
const EDGE_PX = 2;

// The legs mirror about x = 294.
const MIRROR_X = 588;
const WAIST = 807;
const HEM = 1196;
// The left leg's outer silhouette edge, waist to hem, as drawn by the shared pants path.
const LEFT_LEG_EDGE: ReadonlyArray<readonly [number, number]> = [
  [176, 807],
  [170, 812],
  [155, 839],
  [145, 909],
  [129, 923],
  [113, 1050],
  [117, 1066],
  [128, 1077],
  [128, 1097],
  [118, 1133],
  [118, 1196],
];
// A leg-edge stack starts this far inside the silhouette so the figure outline stays visible.
const LEG_EDGE_INSET = 1;
// The straight seam line a centred stack sits on, on the left leg.
const SEAM_X = 126;
// Sock hoops start on the upper calf and span each shin; the sock clip trims them to the shin.
const HOOPS_TOP = 1300;
const SOCK_LEFT_X = [100, 240] as const;

type Side = 'left' | 'right';
const SIDES: Side[] = ['left', 'right'];

const num = (v: number) => String(Math.round(v * 100) / 100);
const mirror = (side: Side, x: number) => (side === 'left' ? x : MIRROR_X - x);

// The band between offsets `from` and `to` inside the leg's outer edge: down the edge at `from`,
// back up at `to`.
function edgeBand(side: Side, from: number, to: number) {
  const at = (offset: number) => (p: readonly [number, number]) =>
    `${num(mirror(side, p[0] + offset))},${p[1]}`;
  const points = [...LEFT_LEG_EDGE.map(at(from)), ...[...LEFT_LEG_EDGE].reverse().map(at(to))];
  return `M${points[0]} ${points
    .slice(1)
    .map((p) => `L${p}`)
    .join(' ')} Z`;
}

// A straight vertical band between x0 and x1 on the left leg, waist to hem.
function straightBand(side: Side, x0: number, x1: number) {
  const [a, b] = side === 'left' ? [x0, x1] : [MIRROR_X - x1, MIRROR_X - x0];
  return `M${num(a)},${WAIST} H${num(b)} V${HEM} H${num(a)} Z`;
}

// A horizontal hoop between y0 and y1 across one sock.
function hoop(side: Side, y0: number, y1: number) {
  const [a, b] =
    side === 'left' ? SOCK_LEFT_X : [MIRROR_X - SOCK_LEFT_X[1], MIRROR_X - SOCK_LEFT_X[0]];
  return `M${a},${num(y0)} H${b} V${num(y1)} H${a} Z`;
}

// Offsets of every piping and band in a stack, measured from its start.
function layout(stack: StripeStack) {
  const e = stack.edge ? EDGE_PX : 0;
  const gap = GAP_PX[stack.gap];
  let cursor = 0;
  const bands = stack.bands.map((band) => {
    const h = SIZE_PX[band.size];
    const slot = {
      color: band.color,
      outer: [cursor, cursor + h + 2 * e],
      inner: [cursor + e, cursor + e + h],
    };
    cursor += h + 2 * e + gap;
    return slot;
  });
  return { bands, width: cursor - gap };
}

function stackLayers(
  prefix: string,
  name: string,
  stack: StripeStack,
  surface: (side: Side) => PartLayer['surface'],
  shape: (side: Side, from: number, to: number) => string
): PartLayer[] {
  const layers: PartLayer[] = [];
  const both = (id: string, color: string, from: number, to: number) => {
    for (const side of SIDES) {
      layers.push({
        id: `${prefix}-${id}-${side}`,
        surface: surface(side),
        clip: true,
        kind: 'fill',
        fill: color,
        d: shape(side, from, to),
      });
    }
  };
  layout(stack).bands.forEach((band, i) => {
    if (stack.edge) both(`${name}-${i}-edge`, stack.edge, band.outer[0], band.outer[1]);
    both(`${name}-${i}`, band.color, band.inner[0], band.inner[1]);
  });
  return layers;
}

export function expandPants(prefix: string, spec: PantsSpec): UniformPart {
  const { stripes } = spec;
  if (!stripes) return { base: spec.body, layers: [] };
  const leg = (side: Side) => (side === 'left' ? 'leg-left' : 'leg-right');
  const start =
    stripes.position === 'leg-edge' ? LEG_EDGE_INSET : SEAM_X - layout(stripes).width / 2;
  const shape =
    stripes.position === 'leg-edge'
      ? (side: Side, from: number, to: number) => edgeBand(side, start + from, start + to)
      : (side: Side, from: number, to: number) => straightBand(side, start + from, start + to);
  return { base: spec.body, layers: stackLayers(prefix, 'stripe', stripes, leg, shape) };
}

export function expandSocks(prefix: string, spec: SocksSpec): UniformPart {
  const { stripes } = spec;
  if (!stripes) return { base: spec.color, layers: [] };
  const sock = (side: Side) => (side === 'left' ? 'sock-left' : 'sock-right');
  const shape = (side: Side, from: number, to: number) =>
    hoop(side, HOOPS_TOP + from, HOOPS_TOP + to);
  return { base: spec.color, layers: stackLayers(prefix, 'hoop', stripes, sock, shape) };
}
