// Declarative uniform definitions separate team construction facts from the shared SVG renderer.
// Stable layer IDs make overrides and SVG keys independent of authoring order.

export type ColorRef = 'primary' | 'secondary' | 'accent' | 'readable-on-body' | `#${string}`;

export type UniformSurface =
  | 'helmet'
  | 'jersey'
  | 'sleeve-left'
  | 'sleeve-right'
  | 'collar'
  | 'number'
  | 'pants'
  | 'leg-left'
  | 'leg-right';

interface LayerBase {
  id: string;
  surface: UniformSurface;
  d: string;
  clip: boolean;
}

export type UniformLayer =
  // fillRule is for multi-subpath marks that carry their own holes (traced decals): without
  // 'evenodd' the enclosed subpaths fill solid instead of punching through.
  | (LayerBase & { kind: 'fill'; fill: ColorRef; fillRule?: 'nonzero' | 'evenodd' })
  | (LayerBase & {
      kind: 'stroke';
      stroke: ColorRef;
      strokeWidth: number;
      lineCap?: 'butt' | 'round' | 'square';
    });

export interface NumberStyle {
  fill: ColorRef;
  outline: ColorRef;
  outlineWidth: number;
  glyphPath?: string;
}

export interface UniformStyle {
  helmetColor: ColorRef;
  // The facemask cage. Team-specific in reality (Seattle black, Miami white, Kansas City grey);
  // every team but Seattle still renders the shared neutral, and each is given its real color by
  // its own ticket in the uniform accuracy pass. A team that has not set one inherits
  // GENERIC_UNIFORM_STYLE's grey, so adding this field repainted nothing.
  facemaskColor: ColorRef;
  jerseyColor: ColorRef;
  pantsColor: ColorRef;
  layers: UniformLayer[];
  number: NumberStyle;
}

export interface UniformStyleOverride {
  helmetColor?: ColorRef;
  facemaskColor?: ColorRef;
  jerseyColor?: ColorRef;
  pantsColor?: ColorRef;
  layers?: UniformLayer[];
  removeLayerIds?: string[];
  number?: Partial<NumberStyle> | null;
}

export interface TeamUniformDefinition {
  teamId: string;
  defaults?: UniformStyleOverride;
  kits: Record<string, UniformStyleOverride>;
}
