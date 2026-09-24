// A declarative jersey description: named construction primitives and palette tokens, no
// coordinates. expandJersey() owns all geometry, fitted once to the shared mannequin, and emits
// ordinary UniformPart layers.
import type { PartLayer, UniformPart } from './parts';
import { GENERIC_COLLAR_PATH, LEGACY_ROUNDED_COLLAR_PATH, modernInsetVCollar } from './shared';

export type JerseySize = 's' | 'm' | 'l';
export type JerseyBand = { color: string; size: JerseySize };

export interface JerseySpec {
  body: string;
  collar: {
    style: 'shallow-v' | 'inset-v' | 'rounded' | 'none';
    color?: string;
    trim?: string;
    // Fill for the neck opening inside the V. Defaults to the body color; a darker shade of the
    // body reads as the jersey's inside without needing an outline.
    inside?: string;
    // inset-v only: a band along the inner edge of the V, and a bar across the back of the neck.
    lining?: string;
    backBar?: string;
  };
  // Color blocks stacked down from the top of each sleeve. The first band is the cap: it fills up
  // to the shoulder seam with a curved inner edge. Every band edge slopes down toward the body.
  shoulderPanel?: { bands: JerseyBand[] };
  // Horizontal stripes around the upper arm, below any shoulder panel.
  sleeveStripes?: { bands: JerseyBand[]; gap: 'none' | 'narrow' | 'wide' };
  // A solid band at the sleeve opening.
  cuff?: { color: string; size: JerseySize };
  number: { fill: string; outline: string; outlineWeight: 'none' | 'thin' | 'regular' | 'heavy' };
}

const SIZE_PX: Record<JerseySize, number> = { s: 11, m: 16, l: 28 };
const GAP_PX = { none: 0, narrow: 6, wide: 12 };
const OUTLINE_PX = { none: 0, thin: 8, regular: 14, heavy: 20 };

type Sleeve = { outer: number; inner: number };
const SLEEVE_LEFT: Sleeve = { outer: 30, inner: 96 };
const SLEEVE_RIGHT: Sleeve = { outer: 558, inner: 492 };

const SHOULDER_TOP = 428; // where the shoulder panel starts at the outer sleeve edge
const SHOULDER_SLANT = 22; // how much lower each band edge sits at the inner end
const CAP_REACH = 60; // the cap extends this far above its band; the silhouette clip trims it
const STRIPES_TOP = 476;
// The inset-V neck opening scaled toward its top centre (294,383), so a stroke along it sits just
// inside the collar edge. The back bar spans the top of the opening.
const INSET_V_LINING_PATH = 'M230,383 C234,411 261,434 294,453 C327,434 354,411 358,383';
const INSET_V_BACK_BAR_PATH = 'M220,383 H368 L366,398 H222 Z';
const CUFF_BOTTOM = 591;

function slantedBand(side: Sleeve, yOuter: number, yInner: number, h: number) {
  return `M${side.outer},${yOuter} L${side.inner},${yInner} L${side.inner},${yInner + h} L${side.outer},${yOuter + h} Z`;
}

function cap(side: Sleeve, yBottomOuter: number, yBottomInner: number) {
  const top = yBottomOuter - CAP_REACH;
  const xMid = side.outer + 0.5 * (side.inner - side.outer);
  return `M${side.outer},${yBottomOuter} L${side.outer},${top} L${xMid},${top} Q${side.inner},${top + 10} ${side.inner},${yBottomInner} Z`;
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
  const { style, color, trim, inside, lining, backBar } = spec.collar;
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
      return [
        ...modernInsetVCollar({
          idPrefix: prefix,
          colors: {
            body: inside ?? spec.body,
            edge: color,
            inset: trim ?? color,
            placket: spec.body,
          },
        }),
        ...(lining ? [stroke('collar-lining', INSET_V_LINING_PATH, 10, lining)] : []),
        ...(backBar
          ? [
              {
                id: `${prefix}-collar-back`,
                surface: 'collar',
                clip: true,
                kind: 'fill',
                fill: backBar,
                d: INSET_V_BACK_BAR_PATH,
              } satisfies PartLayer,
            ]
          : []),
      ];
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
