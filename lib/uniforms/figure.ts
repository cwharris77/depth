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

// Shared 100-wide coordinate space; each part is authored from its own y=0 and stacked
// for 'full' (see PART_SHIFT in components/UniformFigure.tsx). Heights: helmet 0-74,
// jersey 0-122, pants 0-120; 'full' stacks them into a 332-tall column.
const VARIANTS: Record<UniformVariant, VariantSpec> = {
  jersey: { parts: ['jersey'], viewBox: '0 0 100 122' },
  full: { parts: ['helmet', 'jersey', 'pants'], viewBox: '0 0 100 332' },
  helmet: { parts: ['helmet'], viewBox: '0 0 100 74' },
};

export function variantSpec(variant: UniformVariant): VariantSpec {
  return VARIANTS[variant] ?? VARIANTS.jersey;
}
