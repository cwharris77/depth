// Jacksonville authored as composable parts. Geometry is imported from jaguars.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// Every kit is a black shell over a body carrying a band at the sleeve hem and trim at the neck.
// What changes is how each is built: the current kits wear one solid band and a short arc down each
// side of the neck opening, while the throwback wears a two-color band and a full V that closes at
// the chest. No helmet stripe and no pant stripe. The jaguar-head decal (white jaw, gold crown,
// teal tongue) is fixed art on the current black shell. Historical throwback art is separate.
//
// The kits combine two helmets, four jerseys, and three pants colors. Alternate pant options
// preserve the canonical first pairing used by the committed rasters.

import {
  JAGUARS_BAND_LEFT,
  JAGUARS_BAND_RIGHT,
  JAGUARS_BLACK,
  JAGUARS_COLLAR_ARC_LEFT,
  JAGUARS_COLLAR_ARC_RIGHT,
  JAGUARS_COLLAR_ARC_WIDTH,
  JAGUARS_DECAL_PATHS,
  JAGUARS_TB_BAND_LOWER_LEFT,
  JAGUARS_TB_BAND_LOWER_RIGHT,
  JAGUARS_TB_BAND_UPPER_LEFT,
  JAGUARS_TB_BAND_UPPER_RIGHT,
  JAGUARS_TB_COLLAR_PATH,
  JAGUARS_TB_COLLAR_WIDTH,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';

// Preserve the supplied SVG's paint order, including its black keyline and gold shading.
export function jaguarDecal(): PartLayer[] {
  return JAGUARS_DECAL_PATHS.map(({ d, fill }, index) => ({
    id: `jaguars-decal-${index}`,
    surface: 'helmet',
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

// The current kits' single solid sleeve band.
export function sleeveBand(color: string): PartLayer[] {
  return [
    {
      id: 'jaguars-band-left',
      surface: 'sleeve-left',
      d: JAGUARS_BAND_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'jaguars-band-right',
      surface: 'sleeve-right',
      d: JAGUARS_BAND_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// The current kits' two short collar arcs (arms never meet — not a chevron).
export function collarArcs(color: string): PartLayer[] {
  return [
    {
      id: 'jaguars-collar-left',
      surface: 'collar',
      d: JAGUARS_COLLAR_ARC_LEFT,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: JAGUARS_COLLAR_ARC_WIDTH,
    },
    {
      id: 'jaguars-collar-right',
      surface: 'collar',
      d: JAGUARS_COLLAR_ARC_RIGHT,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: JAGUARS_COLLAR_ARC_WIDTH,
    },
  ];
}

// The throwback's two-color band and closing collar V.
export function throwbackBands(upper: string, lower: string): PartLayer[] {
  return [
    {
      id: 'jaguars-band-upper-left',
      surface: 'sleeve-left',
      d: JAGUARS_TB_BAND_UPPER_LEFT,
      clip: true,
      kind: 'fill',
      fill: upper,
    },
    {
      id: 'jaguars-band-upper-right',
      surface: 'sleeve-right',
      d: JAGUARS_TB_BAND_UPPER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: upper,
    },
    {
      id: 'jaguars-band-lower-left',
      surface: 'sleeve-left',
      d: JAGUARS_TB_BAND_LOWER_LEFT,
      clip: true,
      kind: 'fill',
      fill: lower,
    },
    {
      id: 'jaguars-band-lower-right',
      surface: 'sleeve-right',
      d: JAGUARS_TB_BAND_LOWER_RIGHT,
      clip: true,
      kind: 'fill',
      fill: lower,
    },
    {
      id: 'jaguars-collar-v',
      surface: 'collar',
      d: JAGUARS_TB_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: lower,
      strokeWidth: JAGUARS_TB_COLLAR_WIDTH,
    },
  ];
}

// The black shell with the jaguar decal (H1) — shared by home, away and black-alt.
//
// Black cage. The black Jaguars shell wears a black facemask (named sources; the matte black shell
// pairs a dark cage).
export const HELMET_BLACK: UniformPart = {
  base: 'black',
  facemask: 'black',
  layers: jaguarDecal(),
};

// The 1998 throwback shell (H2): a BLACK shell (the kit's accent #101820) with NO decal. The flat
// sets helmetColor to accent = black, so the shell is black and stays bare. The module note about
// "teal shell" describes the hypothetical case; the actual accent is black. The jaguar decal is
// therefore only on H1 (home/away/black-alt).
export const HELMET_TEAL: UniformPart = { base: 'black', facemask: 'black', layers: [] };

// White pants (P1, home/away/teal-throwback).
export const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Black pants (P2, black-alt).
export const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };

// GUD 2025 JAX composite: teal pants with both current teal and white jerseys.
export const PANTS_TEAL: UniformPart = { base: 'teal', layers: [] };
