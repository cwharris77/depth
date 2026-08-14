import { readableTextOn } from '@/lib/utils/colors';
import type { TeamColors } from '@/lib/types';
import type {
  NumberStyle,
  TeamUniformDefinition,
  UniformLayer,
  UniformStyle,
  UniformStyleOverride,
} from '@/lib/uniforms/teams/types';

// Resolves generic, team, and kit uniform construction data into paint-ready SVG values. The
// fallback is deliberately complete so incomplete or unknown team data can never break a render.

const YOKE_L = 'M30,466 L78,417 L136,401 L168,470 L156,556 L34,556 Z';
const YOKE_R = 'M558,466 L510,417 L452,401 L420,470 L432,556 L554,556 Z';

export const GENERIC_UNIFORM_STYLE: UniformStyle = {
  helmetColor: 'primary',
  jerseyColor: 'primary',
  pantsColor: 'primary',
  layers: [
    {
      id: 'generic-helmet-stripe',
      surface: 'helmet',
      d: 'M150,286 H580 V330 H150 Z',
      clip: true,
      kind: 'fill',
      fill: 'accent',
    },
    {
      id: 'generic-sleeve-yoke-left',
      surface: 'sleeve-left',
      d: YOKE_L,
      clip: true,
      kind: 'fill',
      fill: 'accent',
    },
    {
      id: 'generic-sleeve-yoke-right',
      surface: 'sleeve-right',
      d: YOKE_R,
      clip: true,
      kind: 'fill',
      fill: 'accent',
    },
    {
      id: 'generic-sleeve-stripe-left',
      surface: 'sleeve-left',
      d: 'M34,558 L156,558 L152,578 L34,578 Z',
      clip: true,
      kind: 'fill',
      fill: 'secondary',
    },
    {
      id: 'generic-sleeve-stripe-right',
      surface: 'sleeve-right',
      d: 'M554,558 L432,558 L436,578 L554,578 Z',
      clip: true,
      kind: 'fill',
      fill: 'secondary',
    },
    {
      id: 'generic-collar',
      surface: 'collar',
      d: 'M206,388 L294,455 L386,388',
      clip: true,
      kind: 'stroke',
      stroke: 'secondary',
      strokeWidth: 13,
    },
    {
      id: 'generic-pants-stripe-left',
      surface: 'leg-left',
      d: 'M118,807 H134 V1462 H118 Z',
      clip: true,
      kind: 'fill',
      fill: 'secondary',
    },
    {
      id: 'generic-pants-stripe-right',
      surface: 'leg-right',
      d: 'M454,807 H470 V1462 H454 Z',
      clip: true,
      kind: 'fill',
      fill: 'secondary',
    },
  ],
  number: {
    fill: 'readable-on-body',
    outline: 'secondary',
    outlineWidth: 26,
  },
};

type ResolvedUniformLayer =
  | (Omit<Extract<UniformLayer, { kind: 'fill' }>, 'fill'> & { fill: string })
  | (Omit<Extract<UniformLayer, { kind: 'stroke' }>, 'stroke'> & { stroke: string });

export interface ResolvedUniformStyle {
  helmetColor: string;
  jerseyColor: string;
  pantsColor: string;
  layers: ResolvedUniformLayer[];
  number: Omit<NumberStyle, 'fill' | 'outline'> & { fill: string; outline: string };
}

export function resolveColor(ref: unknown, colors: TeamColors, bodyColor: string): string {
  if (ref === 'primary' || ref === 'secondary' || ref === 'accent') return colors[ref];
  if (ref === 'readable-on-body') return readableTextOn(bodyColor);
  if (typeof ref === 'string' && ref.startsWith('#')) return ref;
  return colors.primary;
}

function copyStyle(style: UniformStyle): UniformStyle {
  return {
    ...style,
    layers: style.layers.map((layer) => ({ ...layer })),
    number: { ...style.number },
  };
}

function mergeLayers(
  inherited: UniformLayer[],
  layers?: UniformLayer[],
  removeLayerIds?: string[]
): UniformLayer[] {
  const removed = new Set(removeLayerIds);
  const merged = inherited.filter((layer) => !removed.has(layer.id)).map((layer) => ({ ...layer }));

  for (const layer of layers ?? []) {
    const index = merged.findIndex((inheritedLayer) => inheritedLayer.id === layer.id);
    if (index === -1) merged.push({ ...layer });
    else merged[index] = { ...layer };
  }

  return merged;
}

function mergeStyle(style: UniformStyle, override?: UniformStyleOverride): UniformStyle {
  if (!override) return copyStyle(style);

  return {
    helmetColor: override.helmetColor ?? style.helmetColor,
    jerseyColor: override.jerseyColor ?? style.jerseyColor,
    pantsColor: override.pantsColor ?? style.pantsColor,
    layers: mergeLayers(style.layers, override.layers, override.removeLayerIds),
    number:
      override.number === null
        ? { ...GENERIC_UNIFORM_STYLE.number }
        : { ...style.number, ...override.number },
  };
}

function resolveLayer(
  layer: UniformLayer,
  colors: TeamColors,
  bodyColor: string
): ResolvedUniformLayer {
  if (layer.kind === 'fill') return { ...layer, fill: resolveColor(layer.fill, colors, bodyColor) };
  return { ...layer, stroke: resolveColor(layer.stroke, colors, bodyColor) };
}

export function resolveUniformModel(
  definition: TeamUniformDefinition | undefined,
  kitSlug: string,
  colors: TeamColors
): ResolvedUniformStyle {
  const withDefaults = mergeStyle(GENERIC_UNIFORM_STYLE, definition?.defaults);
  const style = mergeStyle(withDefaults, definition?.kits?.[kitSlug]);
  const jerseyColor = resolveColor(style.jerseyColor, colors, colors.primary);

  return {
    helmetColor: resolveColor(style.helmetColor, colors, jerseyColor),
    jerseyColor,
    pantsColor: resolveColor(style.pantsColor, colors, jerseyColor),
    layers: style.layers.map((layer) => resolveLayer(layer, colors, jerseyColor)),
    number: {
      ...style.number,
      fill: resolveColor(style.number.fill, colors, jerseyColor),
      outline: resolveColor(style.number.outline, colors, jerseyColor),
    },
  };
}
