// A declarative jersey description: named construction primitives and palette tokens, no
// coordinates. expandJersey() owns all geometry, fitted once to the shared mannequin, and emits
// ordinary UniformPart layers.
import type { PartLayer, UniformPart } from './parts';
import { JERSEY_NUMBER_THREE } from '../../jersey-art';
import { GENERIC_COLLAR_PATH, LEGACY_ROUNDED_COLLAR_PATH, modernInsetVCollar } from './shared';

export type JerseySize = 's' | 'm' | 'l';
export type JerseyBand = { color: string; size: JerseySize };
export type JerseyGap = 'none' | 'narrow' | 'wide' | 'broad';

export interface JerseySpec {
  body: string;
  collar: {
    style: 'shallow-v' | 'inset-v' | 'rounded' | 'none';
    color?: string;
    trim?: string;
    // Fill for the neck opening inside the V. Defaults to the body color; a darker shade of the
    // body reads as the jersey's inside without needing an outline.
    inside?: string;
    // inset-v only: see modernInsetVCollar.
    lining?: string;
    backBar?: string;
    outline?: boolean;
  };
  // Color blocks stacked down from the top of each sleeve. The first band is the cap: it fills up
  // to the shoulder seam with a curved inner edge. Every band edge slopes down toward the body.
  shoulderPanel?: { bands: JerseyBand[] };
  // Canted stripes running down from the shoulder line, listed from the collar outward. Each
  // stripe leans its lower end toward the body.
  shoulderStripes?: { bands: JerseyBand[]; gap: JerseyGap };
  // Horizontal stripes around the upper arm, below any shoulder panel.
  sleeveStripes?: { bands: JerseyBand[]; gap: JerseyGap };
  // A solid band at the sleeve opening.
  cuff?: { color: string; size: JerseySize };
  // The numeral repeated small and upright on the lower outer face of each sleeve.
  sleeveNumber?: { fill: string };
  number: { fill: string; outline: string; outlineWeight: 'none' | 'thin' | 'regular' | 'heavy' };
}

const SIZE_PX: Record<JerseySize, number> = { s: 11, m: 16, l: 28 };
const GAP_PX: Record<JerseyGap, number> = { none: 0, narrow: 6, wide: 12, broad: 18 };
const OUTLINE_PX = { none: 0, thin: 8, regular: 14, heavy: 20 };

type Sleeve = { outer: number; inner: number };
const SLEEVE_LEFT: Sleeve = { outer: 30, inner: 96 };
const SLEEVE_RIGHT: Sleeve = { outer: 558, inner: 492 };

const SHOULDER_TOP = 428; // where the shoulder panel starts at the outer sleeve edge
const SHOULDER_SLANT = 22; // how much lower each band edge sits at the inner end
const CAP_REACH = 60; // the cap extends this far above its band; the silhouette clip trims it
const STRIPES_TOP = 476;
const SHOULDER_STRIPE_REF_Y = 400; // where the first stripe's collar-side edge is placed
const SHOULDER_STRIPE_START_X = 156; // that edge's x on the left sleeve at SHOULDER_STRIPE_REF_Y
const SHOULDER_STRIPE_LEAN = 0.25; // inward x shift per unit of drop
const SHOULDER_STRIPE_TOP = 360; // above the shoulder line; the silhouette clip trims it
const SHOULDER_STRIPE_BOTTOM = 495;
const MIRROR_X = SLEEVE_LEFT.outer + SLEEVE_RIGHT.outer;
const CUFF_BOTTOM = 591;
const SLEEVE_NUMBER_HEIGHT = 40;
const SLEEVE_NUMBER_CENTER_Y = 542;

function slantedBand(side: Sleeve, yOuter: number, yInner: number, h: number) {
  return `M${side.outer},${yOuter} L${side.inner},${yInner} L${side.inner},${yInner + h} L${side.outer},${yOuter + h} Z`;
}

function cap(side: Sleeve, yBottomOuter: number, yBottomInner: number) {
  const top = yBottomOuter - CAP_REACH;
  const xMid = side.outer + 0.5 * (side.inner - side.outer);
  return `M${side.outer},${yBottomOuter} L${side.outer},${top} L${xMid},${top} Q${side.inner},${top + 10} ${side.inner},${yBottomInner} Z`;
}

// One canted stripe spanning [xOuter, xInner] on the left sleeve at SHOULDER_STRIPE_REF_Y,
// mirrored onto the right sleeve.
function shoulderStripe(side: Sleeve, xOuter: number, xInner: number) {
  const at = (x: number, y: number) => {
    const lx = x + SHOULDER_STRIPE_LEAN * (y - SHOULDER_STRIPE_REF_Y);
    return `${side === SLEEVE_LEFT ? lx : MIRROR_X - lx},${y}`;
  };
  const [t, b] = [SHOULDER_STRIPE_TOP, SHOULDER_STRIPE_BOTTOM];
  return `M${at(xOuter, t)} L${at(xInner, t)} L${at(xInner, b)} L${at(xOuter, b)} Z`;
}

// JERSEY_NUMBER_THREE scaled to SLEEVE_NUMBER_HEIGHT and centred on the sleeve. The glyph is
// absolute M/L/Z only, so every number pair is an x,y point.
function sleeveNumber(side: Sleeve) {
  const nums = (JERSEY_NUMBER_THREE.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = SLEEVE_NUMBER_HEIGHT / (y1 - y0);
  const cx = (side.outer + side.inner) / 2;
  let i = 0;
  return JERSEY_NUMBER_THREE.replace(/-?\d+(?:\.\d+)?/g, (n) => {
    const v = Number(n);
    const out =
      i++ % 2 === 0
        ? cx + (v - (x0 + x1) / 2) * k
        : SLEEVE_NUMBER_CENTER_Y + (v - (y0 + y1) / 2) * k;
    return String(Math.round(out * 100) / 100);
  });
}

function bothSleeves(id: string, color: string, shape: (side: Sleeve) => string): PartLayer[] {
  const layer = (
    suffix: string,
    surface: 'sleeve-left' | 'sleeve-right',
    side: Sleeve
  ): PartLayer => ({
    id: `${id}-${suffix}`,
    surface,
    clip: true,
    kind: 'fill',
    fill: color,
    d: shape(side),
  });
  return [layer('left', 'sleeve-left', SLEEVE_LEFT), layer('right', 'sleeve-right', SLEEVE_RIGHT)];
}

function collarLayers(prefix: string, spec: JerseySpec): PartLayer[] {
  const { style, color, trim, inside, lining, backBar, outline } = spec.collar;
  if (style === 'none' || !color) return [];
  const stroke = (id: string, d: string, width: number, c: string): PartLayer => ({
    id: `${prefix}-${id}`,
    surface: 'collar',
    clip: true,
    kind: 'stroke',
    stroke: c,
    strokeWidth: width,
    d,
  });
  switch (style) {
    case 'shallow-v':
      return [
        stroke('collar', GENERIC_COLLAR_PATH, 16, color),
        ...(trim ? [stroke('collar-trim', GENERIC_COLLAR_PATH, 6, trim)] : []),
      ];
    case 'rounded':
      return [
        stroke('collar', LEGACY_ROUNDED_COLLAR_PATH, 12, color),
        ...(trim ? [stroke('collar-trim', LEGACY_ROUNDED_COLLAR_PATH, 4, trim)] : []),
      ];
    case 'inset-v':
      return modernInsetVCollar({
        idPrefix: prefix,
        colors: {
          interior: inside ?? spec.body,
          edge: color,
          inset: trim ?? color,
          placket: spec.body,
          lining,
          backBar,
        },
        outline,
      });
  }
}

export function expandJersey(prefix: string, spec: JerseySpec): UniformPart {
  const layers: PartLayer[] = [];

  let y = SHOULDER_TOP;
  spec.shoulderPanel?.bands.forEach((band, i) => {
    const h = SIZE_PX[band.size];
    const top = y;
    layers.push(
      ...bothSleeves(`${prefix}-shoulder-${i}`, band.color, (side) =>
        i === 0
          ? cap(side, top + h, top + h + SHOULDER_SLANT)
          : slantedBand(side, top, top + SHOULDER_SLANT, h)
      )
    );
    y += h;
  });

  if (spec.shoulderStripes) {
    const gap = GAP_PX[spec.shoulderStripes.gap];
    let x = SHOULDER_STRIPE_START_X;
    spec.shoulderStripes.bands.forEach((band, i) => {
      const inner = x;
      const outer = x - SIZE_PX[band.size];
      layers.push(
        ...bothSleeves(`${prefix}-shoulder-stripe-${i}`, band.color, (side) =>
          shoulderStripe(side, outer, inner)
        )
      );
      x = outer - gap;
    });
  }

  if (spec.sleeveStripes) {
    const gap = GAP_PX[spec.sleeveStripes.gap];
    let sy = STRIPES_TOP;
    spec.sleeveStripes.bands.forEach((band, i) => {
      const h = SIZE_PX[band.size];
      const top = sy;
      layers.push(
        ...bothSleeves(`${prefix}-stripe-${i}`, band.color, (side) =>
          slantedBand(side, top, top, h)
        )
      );
      sy += h + gap;
    });
  }

  if (spec.cuff) {
    const h = SIZE_PX[spec.cuff.size] + 10;
    layers.push(
      ...bothSleeves(`${prefix}-cuff`, spec.cuff.color, (side) =>
        slantedBand(side, CUFF_BOTTOM - h, CUFF_BOTTOM - h, h)
      )
    );
  }

  if (spec.sleeveNumber) {
    layers.push(...bothSleeves(`${prefix}-sleeve-number`, spec.sleeveNumber.fill, sleeveNumber));
  }

  layers.push(...collarLayers(prefix, spec));

  return {
    base: spec.body,
    layers,
    number: {
      fill: spec.number.fill,
      outline: spec.number.outline,
      outlineWidth: OUTLINE_PX[spec.number.outlineWeight],
    },
  };
}
