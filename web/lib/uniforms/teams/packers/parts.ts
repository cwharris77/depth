// Green Bay authored as composable parts. Geometry is imported unchanged from packers.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The construction is fixed: every kit wears the same green/white/green helmet stripe set, the
// same gold/white/gold sleeve set and the same concentric gold/white/gold collar. The four kits
// combine only three helmets, three jerseys and three pants:
//   home            gold shell+marks / green body / gold pants+stripe
//   away            gold shell+marks / white body / gold pants+stripe   (shares the white body
//                     with winter-warning below, and the gold shell/pants with home)
//   winter-warning  white shell+marks / white body / white pants+stripe (shares the white body)
//   1923-throwback  leather shell, bare / navy body / leather pants     (bronze sleeve+collar)

import {
  PACKERS_COLLAR_WIDTHS,
  PACKERS_HELMET_STRIPE_INNER_PATH,
  PACKERS_HELMET_STRIPE_PATH,
  PACKERS_PANTS_GREEN_LEFT,
  PACKERS_PANTS_GREEN_RIGHT,
  PACKERS_PANTS_WHITE_LEFT,
  PACKERS_PANTS_WHITE_RIGHT,
  PACKERS_SLEEVE_GOLD_LOWER_LEFT,
  PACKERS_SLEEVE_GOLD_LOWER_RIGHT,
  PACKERS_SLEEVE_GOLD_UPPER_LEFT,
  PACKERS_SLEEVE_GOLD_UPPER_RIGHT,
  PACKERS_SLEEVE_WHITE_LEFT,
  PACKERS_SLEEVE_WHITE_RIGHT,
} from './source';
import { PACKERS_G_MARK_LAYERS } from './decal';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';
import { LEGACY_ROUNDED_COLLAR_PATH } from '../core/shared';

export const COLLAR_PATH = 'M206,388 L294,455 L386,388';

// Gold/white/gold sleeve stripe set.
export function sleeveStripes(): PartLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: string }[] = [
    {
      id: 'packers-sleeve-gold-upper-left',
      surface: 'sleeve-left',
      d: PACKERS_SLEEVE_GOLD_UPPER_LEFT,
      fill: 'gold',
    },
    {
      id: 'packers-sleeve-gold-upper-right',
      surface: 'sleeve-right',
      d: PACKERS_SLEEVE_GOLD_UPPER_RIGHT,
      fill: 'gold',
    },
    {
      id: 'packers-sleeve-white-left',
      surface: 'sleeve-left',
      d: PACKERS_SLEEVE_WHITE_LEFT,
      fill: 'white',
    },
    {
      id: 'packers-sleeve-white-right',
      surface: 'sleeve-right',
      d: PACKERS_SLEEVE_WHITE_RIGHT,
      fill: 'white',
    },
    {
      id: 'packers-sleeve-gold-lower-left',
      surface: 'sleeve-left',
      d: PACKERS_SLEEVE_GOLD_LOWER_LEFT,
      fill: 'gold',
    },
    {
      id: 'packers-sleeve-gold-lower-right',
      surface: 'sleeve-right',
      d: PACKERS_SLEEVE_GOLD_LOWER_RIGHT,
      fill: 'gold',
    },
  ];
  return shapes.map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' }));
}

// Concentric gold/white/gold collar, widest gold first.
export function collar(): PartLayer[] {
  return [
    { id: 'packers-collar-outer', stroke: 'gold', strokeWidth: PACKERS_COLLAR_WIDTHS.gold },
    { id: 'packers-collar-mid', stroke: 'white', strokeWidth: PACKERS_COLLAR_WIDTHS.white },
    { id: 'packers-collar-inner', stroke: 'gold', strokeWidth: PACKERS_COLLAR_WIDTHS.goldInner },
  ].map((s): PartLayer => ({
    ...s,
    surface: 'collar',
    d: COLLAR_PATH,
    clip: true,
    kind: 'stroke',
  }));
}

// Green/white/green pant stripe set.
export function pantsStripes(): PartLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: string }[] = [
    {
      id: 'packers-pants-outer-left',
      surface: 'leg-left',
      d: PACKERS_PANTS_GREEN_LEFT,
      fill: 'green',
    },
    {
      id: 'packers-pants-outer-right',
      surface: 'leg-right',
      d: PACKERS_PANTS_GREEN_RIGHT,
      fill: 'green',
    },
    {
      id: 'packers-pants-inner-left',
      surface: 'leg-left',
      d: PACKERS_PANTS_WHITE_LEFT,
      fill: 'white',
    },
    {
      id: 'packers-pants-inner-right',
      surface: 'leg-right',
      d: PACKERS_PANTS_WHITE_RIGHT,
      fill: 'white',
    },
  ];
  return shapes.map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' }));
}

// The green/white/green crown stripe, hugging the shell silhouette.
export function helmetStripe(): PartLayer[] {
  return [
    {
      id: 'packers-helmet-stripe',
      surface: 'helmet',
      d: PACKERS_HELMET_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill: 'green',
    },
    {
      id: 'packers-helmet-stripe-inner',
      surface: 'helmet',
      d: PACKERS_HELMET_STRIPE_INNER_PATH,
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ];
}

// The supplied three-color G, in source paint order. The compiler resolves each literal source
// color through the palette below so this shared helmet part remains independent of kit-row colors.
export function decal(): PartLayer[] {
  return PACKERS_G_MARK_LAYERS.map((layer): PartLayer => ({
    ...layer,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
    fill: layer.fill,
  }));
}

// The gold shell with the stripe set and the G decal — shared by home and away.
//
// Grey cage. The modern gold shell wears a grey/light-grey facemask (named sources); the GUD
// composite reads it at #8f8f90 against the gold, clearly distinct from the shell. The shared
// neutral #4b5158 it replaces is a darker grey than the real cage.
export const HELMET_GOLD: UniformPart = {
  base: 'gold',
  facemask: 'cageGrey',
  layers: [...helmetStripe(), ...decal()],
};

// The 1923 throwback's leather shell, bare — no stripe, no decal (the era had neither), and no
// documented cage (it predates the facemask). Left on the default.
export const HELMET_LEATHER: UniformPart = { base: 'leather', layers: [] };

// Winter Warning's white shell, carrying the same stripe and decal as the gold one, and the same
// modern grey cage.
export const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'cageGrey',
  layers: [...helmetStripe(), ...decal()],
};

// Gold pants with the green/white/green stripe (home + away).
export const PANTS_GOLD: UniformPart = { base: 'gold', layers: pantsStripes() };

// The 1923 throwback's leather pants, bare.
export const PANTS_LEATHER: UniformPart = { base: 'leather', layers: [] };

// Winter Warning's white pants with the green/white/green stripe.
export const PANTS_WHITE: UniformPart = { base: 'white', layers: pantsStripes() };
