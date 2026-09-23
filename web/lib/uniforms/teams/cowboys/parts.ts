// Dallas authored as composable parts. Geometry is imported unchanged from cowboys.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// What the flat definition was hiding: both Cowboys kits wear the SAME silver shell with the navy
// star decal (white keyline over navy body) and the SAME white pants. But unlike most teams, the
// two kits are NOT one construction recolored — home has a white/silver neck band and V-collar on
// a navy body; away has navy sleeve caps on a white body. So the shared parts are the helmet and
// pants only; the jerseys are genuinely different constructions that happen to both use navy as
// their accent. The flat form reached the star's navy through `primary` at home and `secondary`
// away and the pants through a white literal (the home palette has no white token); here those
// are one palette entry each.

import { COWBOYS_DECAL_PATHS as GENERATED_COWBOYS_DECAL_PATHS } from './decal';
import { type PartLayer, type UniformPart } from '../core/parts';
import { LEGACY_ROUNDED_COLLAR_PATH } from '../core/shared';

export const COLLAR_PATH = LEGACY_ROUNDED_COLLAR_PATH;

// The complete navy/white star is generated from the supplied SVG in its original paint order.
// The generator excludes only that file's canvas/frame export artifacts; its coordinates preserve
// the existing GUD-measured helmet envelope.
export function star(): PartLayer[] {
  return GENERATED_COWBOYS_DECAL_PATHS.map((layer, index) => ({
    id: `cowboys-decal-${index}`,
    surface: 'helmet',
    d: layer.d,
    clip: true,
    kind: 'fill',
    fill: layer.fill,
  }));
}

// The silver shell with the navy star — one object, shared by both kits. The "Blue Metallic" shell
// comes from the module constant (published helmet color, teamcolorcodes); the GUD composite reads
// it a step lighter (#B7C3CD) under its own shading.
//
// Steel cage. The Cowboys' shell carries a steel/silver facemask (named sources; the GUD composite
// reads the bars at #808080, darker than the shell itself). The shared neutral #4b5158 it replaces
// is a near-black grey and reads differently against the silver shell.
export const HELMET_SILVER_STAR: UniformPart = {
  base: 'helmetSilver',
  facemask: 'steelGrey',
  layers: star(),
};

// Plain white pants, shared by both kits. Home reaches this through a white literal in the flat
// form; away through its primary.
export const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
