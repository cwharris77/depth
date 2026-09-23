// Philadelphia authored as composable parts. Geometry is imported unchanged from eagles.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The current kits (home, away) are one construction: a deep collar yoke and a solid band at the
// sleeve hem. The kelly-green throwback drops the cuff entirely (its sleeve runs unbroken to the
// hem) and keeps only the collar. No helmet stripe, no pant stripe on any kit. All shells wear
// the same wing: white, black and silver layers in source paint order, so none of its colors moves
// with the shell. The five kits combine three helmets (green shell, kelly shell, black shell),
// five jersey constructions (green, white, black, original kelly, modern kelly), and four pants.

import {
  EAGLES_BLACK,
  EAGLES_COLLAR_PATH,
  EAGLES_COLLAR_WIDTH,
  EAGLES_CUFF_LEFT,
  EAGLES_CUFF_RIGHT,
  EAGLES_DECAL_BLACK_PATH,
  EAGLES_DECAL_SILVER_PATH,
  EAGLES_DECAL_WHITE_PATH,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';
import { LEGACY_ROUNDED_COLLAR_PATH } from '../core/shared';

// The wing — source paint order is white substrate, black feather channels, then silver body.
// Every shell shares this exact placement and fixed palette.
export function wing(): PartLayer[] {
  return [
    {
      id: 'eagles-decal-white',
      surface: 'helmet',
      d: EAGLES_DECAL_WHITE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
    {
      id: 'eagles-decal-black',
      surface: 'helmet',
      d: EAGLES_DECAL_BLACK_PATH,
      clip: true,
      kind: 'fill',
      fill: 'black',
    },
    {
      id: 'eagles-decal-silver',
      surface: 'helmet',
      d: EAGLES_DECAL_SILVER_PATH,
      clip: true,
      kind: 'fill',
      fill: 'silver',
    },
  ];
}

// The solid sleeve cuff band at the hem.
export function cuff(color: string): PartLayer[] {
  return [
    {
      id: 'eagles-cuff-left',
      surface: 'sleeve-left',
      d: EAGLES_CUFF_LEFT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
    {
      id: 'eagles-cuff-right',
      surface: 'sleeve-right',
      d: EAGLES_CUFF_RIGHT,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// The deep collar yoke (deeper than the generic chevron).
export function collar(color: string, path = EAGLES_COLLAR_PATH): PartLayer[] {
  return [
    {
      id: 'eagles-collar',
      surface: 'collar',
      d: path,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: EAGLES_COLLAR_WIDTH,
    },
  ];
}

// Green shell (H1) — shared by home and away.
export const HELMET_GREEN: UniformPart = { base: 'green', facemask: 'black', layers: wing() };

// Kelly-green shell (H2).
export const HELMET_KELLY: UniformPart = { base: 'kelly', facemask: 'black', layers: wing() };

// Black shell (H3, black-alt).
export const HELMET_BLACK: UniformPart = { base: 'black', facemask: 'black', layers: wing() };

// Pants — no pant stripe on any kit; each takes its body color.
export const PANTS_GREEN: UniformPart = { base: 'green', layers: [] };
export const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
export const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };
export const PANTS_KELLY: UniformPart = { base: 'kelly', layers: [] };
