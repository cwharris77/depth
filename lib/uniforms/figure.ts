// Variant registry for the generated vector uniform (UniformFigure). A "variant" is a
// preset naming which uniform parts to draw and the SVG viewBox — the ONLY place that
// couples a variant to geometry. New variants (e.g. 'helmet') are one map entry here;
// the component reads this and renders the named parts, so no geometry changes are
// needed to add one. The picker uses 'jersey' (see components/JerseySwatch.tsx).

export type UniformVariant = 'jersey' | 'full' | 'helmet';
export type FigurePart = 'helmet' | 'jersey' | 'pants';

export interface VariantSpec {
  parts: FigurePart[];
  viewBox: string;
}

// One shared full-body mannequin is drawn (components/UniformFigure.tsx); a variant is just
// the viewBox that crops it to a region. Coordinates are the vectorized template's own space
// (viewBox origin 20,45; full body 560×1535). 'jersey' crops to the torso for the picker
// swatch; 'helmet' crops to the (0.5-scaled) helmet.
const VARIANTS: Record<UniformVariant, VariantSpec> = {
  jersey: { parts: ['jersey'], viewBox: '20 372 560 452' },
  full: { parts: ['helmet', 'jersey', 'pants'], viewBox: '20 45 560 1535' },
  helmet: { parts: ['helmet'], viewBox: '145 40 330 315' },
};

export function variantSpec(variant: UniformVariant): VariantSpec {
  return VARIANTS[variant] ?? VARIANTS.jersey;
}
