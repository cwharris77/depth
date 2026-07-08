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

const VARIANTS: Record<UniformVariant, VariantSpec> = {
  jersey: { parts: ['jersey'], viewBox: '0 0 48 48' },
  full: { parts: ['helmet', 'jersey', 'pants'], viewBox: '0 0 48 96' },
  helmet: { parts: ['helmet'], viewBox: '0 0 48 40' },
};

export function variantSpec(variant: UniformVariant): VariantSpec {
  return VARIANTS[variant] ?? VARIANTS.jersey;
}
