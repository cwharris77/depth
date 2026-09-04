// Composable uniform parts: an AUTHORING layer over TeamUniformDefinition, not a new
// runtime. A team declares a named palette plus independent helmet/jersey/pants parts, and
// `compileParts` assembles a kit's three references into the flat definition the renderer
// already consumes — so UniformFigure, resolveUniformModel and every caller are untouched,
// and teams migrate one at a time.
//
// Why parts exist: a kit is physically a combination (an alternate is often the away top over
// home pants with the home helmet), but the flat definition spells every kit out in full, so
// the same decal and stripe set are re-authored per kit and can silently drift apart.
//
// Why a named palette: ColorRef's 'primary'/'secondary'/'accent' resolve against the KIT ROW's
// JerseyColors, which differ per kit — Chicago's one navy shell is `primary` at home and
// `secondary` away and in the orange alternate. A part referenced by two kits would therefore
// repaint itself depending on who referenced it, which defeats the point. Parts name their
// colors from the team palette instead and compile to literal hexes, so a part paints the same
// pixels wherever it is used. The row's three colors keep their real job (app chrome via
// lib/utils/team-surfaces.ts, invariant 4) and stop doubling as the geometry palette.

import { GENERIC_UNIFORM_STYLE } from '../model';
import type {
  ColorRef,
  NumberStyle,
  TeamUniformDefinition,
  UniformLayer,
  UniformStyleOverride,
  UniformSurface,
} from './types';

// A palette key is any name the team module chooses ('navy', 'orange', 'white'). Parts refer to
// colors by key; compilation substitutes the hex. `readable-on-body` is passed through unchanged
// because it is resolved against the assembled body color at render time, not authoring time.
export type PaletteRef = string | 'readable-on-body';

export interface UniformPart {
  // The shell/body/leg color this part paints under its layers.
  base: PaletteRef;
  // Layers in paint order, authored with palette keys rather than kit-relative ColorRefs.
  layers: PartLayer[];
  // Only a helmet part carries a facemask; omitted, the kit keeps the shared neutral cage from
  // GENERIC_UNIFORM_STYLE. The cage belongs to the helmet because that is how it is swapped in
  // reality — a kit borrowing another kit's helmet borrows its facemask with it.
  facemask?: PaletteRef;
  // Only a jersey part carries numerals.
  number?: PartNumberStyle;
}

// Mirrors UniformLayer, but colors are palette keys. Written out rather than derived with
// Omit<UniformLayer, ...>: Omit over a union collapses to the keys the members share, which
// silently drops per-member fields like fillRule and lineCap.
interface PartLayerBase {
  id: string;
  surface: UniformSurface;
  d: string;
  clip: boolean;
}

export type PartLayer =
  | (PartLayerBase & { kind: 'fill'; fill: PaletteRef; fillRule?: 'nonzero' | 'evenodd' })
  | (PartLayerBase & {
      kind: 'stroke';
      stroke: PaletteRef;
      strokeWidth: number;
      lineCap?: 'butt' | 'round' | 'square';
    });

export type PartNumberStyle = Omit<NumberStyle, 'fill' | 'outline'> & {
  fill: PaletteRef;
  outline: PaletteRef;
};

export interface KitRef {
  helmet: string;
  jersey: string;
  pants: string;
}

export interface TeamPartsDefinition {
  teamId: string;
  palette: Record<string, string>;
  helmets: Record<string, UniformPart>;
  jerseys: Record<string, UniformPart>;
  pants: Record<string, UniformPart>;
  kits: Record<string, KitRef>;
}

// Every generic mannequin layer is stripped from a parts-based kit, without exception: parts are
// TOTAL, not additive. A surviving generic layer would take its color from the kit row's
// 'secondary'/'accent', which is exactly the kit-relative resolution parts exist to escape — a
// part would then paint differently depending on which kit referenced it. A part that wants a
// generic mark keeps it explicitly via fromGeneric(), with a palette color.
const GENERIC_LAYER_IDS = GENERIC_UNIFORM_STYLE.layers.map((layer) => layer.id);

// Reuses a generic mannequin layer's geometry under a palette color. The generic layer is a fact
// about the mannequin (where a pant stripe sits), so a team that wants the default stripe should
// not restate its path.
export function fromGeneric(id: string, color: PaletteRef): PartLayer {
  const layer = GENERIC_UNIFORM_STYLE.layers.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`unknown generic layer "${id}"`);
  return layer.kind === 'fill'
    ? { ...layer, kind: 'fill', fill: color }
    : { ...layer, kind: 'stroke', stroke: color };
}

function hex(palette: Record<string, string>, ref: PaletteRef, teamId: string): string {
  if (ref === 'readable-on-body') return ref;
  const value = palette[ref];
  // A typo in a palette key would otherwise resolve to colors.primary at render time and paint
  // a plausible-but-wrong color, which no test would catch. Fail at authoring time instead.
  if (!value) throw new Error(`${teamId}: unknown palette color "${ref}"`);
  return value;
}

function compileLayers(part: UniformPart, palette: Record<string, string>, teamId: string) {
  return part.layers.map((layer): UniformLayer => {
    const to = (ref: PaletteRef) => hex(palette, ref, teamId) as ColorRef;
    return layer.kind === 'fill'
      ? { ...layer, kind: 'fill', fill: to(layer.fill) }
      : { ...layer, kind: 'stroke', stroke: to(layer.stroke) };
  });
}

function lookup(group: Record<string, UniformPart>, id: string, kind: string, teamId: string) {
  const part = group[id];
  if (!part) throw new Error(`${teamId}: kit references unknown ${kind} part "${id}"`);
  return part;
}

// Assembles each kit's three part references into the flat per-kit override the renderer reads.
// Paint order is helmet -> jersey -> pants, matching the mannequin's own surface order; parts
// only paint their own surfaces, so the order between them is not load-bearing, but keeping it
// fixed makes a compiled definition diffable against the hand-written one it replaces.
export function compileParts(def: TeamPartsDefinition): TeamUniformDefinition {
  const { teamId, palette } = def;
  const kits: Record<string, UniformStyleOverride> = {};

  for (const [slug, ref] of Object.entries(def.kits)) {
    const helmet = lookup(def.helmets, ref.helmet, 'helmet', teamId);
    const jersey = lookup(def.jerseys, ref.jersey, 'jersey', teamId);
    const pants = lookup(def.pants, ref.pants, 'pants', teamId);
    const number = jersey.number;

    kits[slug] = {
      helmetColor: hex(palette, helmet.base, teamId) as ColorRef,
      ...(helmet.facemask && {
        facemaskColor: hex(palette, helmet.facemask, teamId) as ColorRef,
      }),
      jerseyColor: hex(palette, jersey.base, teamId) as ColorRef,
      pantsColor: hex(palette, pants.base, teamId) as ColorRef,
      removeLayerIds: GENERIC_LAYER_IDS,
      layers: [
        ...compileLayers(helmet, palette, teamId),
        ...compileLayers(jersey, palette, teamId),
        ...compileLayers(pants, palette, teamId),
      ],
      number: number && {
        ...number,
        fill: hex(palette, number.fill, teamId) as ColorRef,
        outline: hex(palette, number.outline, teamId) as ColorRef,
      },
    };
  }

  return { teamId, kits };
}
