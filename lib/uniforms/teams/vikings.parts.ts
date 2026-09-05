// Minnesota authored as composable parts. Geometry is imported unchanged from vikings.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// One construction across all four kits: horn-and-crescent on the shell, two sleeve bands, a
// two-weight collar, and a two-weight pant stripe. Only which color sits above the other changes.
//
// The migration's measured target is 2 helmet / 2 jersey / 3 pants, and the parts BEFORE facemasks
// factor to exactly that — which is what the parity gate proved. The savings are the invisible
// kind: `home` and `purple-classic` are the same jersey (purple body, white-over-gold bands, white
// numerals) reached through different tokens, as are `away` and `winter-warrior` (white body,
// purple-over-gold), and `purple-classic` and `winter-warrior` share a pants part.
//
// The facemask then splits the purple shell in two, and that is a real distinction rather than a
// failure to factor — see HELMET_PURPLE_CLASSIC.

import {
  VIKINGS_BAND_LOWER_LEFT,
  VIKINGS_BAND_LOWER_RIGHT,
  VIKINGS_BAND_UPPER_LEFT,
  VIKINGS_BAND_UPPER_RIGHT,
  VIKINGS_COLLAR_PATH,
  VIKINGS_DECAL_CRESCENT_PATH,
  VIKINGS_DECAL_HORN_PATH,
  VIKINGS_PANTS_INNER_LEFT,
  VIKINGS_PANTS_INNER_RIGHT,
  VIKINGS_PANTS_OUTER_LEFT,
  VIKINGS_PANTS_OUTER_RIGHT,
} from './vikings';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// One two-band set across all four kits; only which color sits above the other changes.
function sleeveBands(upper: string, lower: string): PartLayer[] {
  const shapes: [string, UniformSurface, string, string][] = [
    ['vikings-band-upper-left', 'sleeve-left', VIKINGS_BAND_UPPER_LEFT, upper],
    ['vikings-band-upper-right', 'sleeve-right', VIKINGS_BAND_UPPER_RIGHT, upper],
    ['vikings-band-lower-left', 'sleeve-left', VIKINGS_BAND_LOWER_LEFT, lower],
    ['vikings-band-lower-right', 'sleeve-right', VIKINGS_BAND_LOWER_RIGHT, lower],
  ];
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

function pantsStripes(outer: string, inner: string): PartLayer[] {
  const shapes: [string, UniformSurface, string, string][] = [
    ['vikings-pants-outer-left', 'leg-left', VIKINGS_PANTS_OUTER_LEFT, outer],
    ['vikings-pants-outer-right', 'leg-right', VIKINGS_PANTS_OUTER_RIGHT, outer],
    ['vikings-pants-inner-left', 'leg-left', VIKINGS_PANTS_INNER_LEFT, inner],
    ['vikings-pants-inner-right', 'leg-right', VIKINGS_PANTS_INNER_RIGHT, inner],
  ];
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

function collar(outer: string, inner: string): PartLayer[] {
  return (
    [
      ['vikings-collar-outer', outer, 18],
      ['vikings-collar-inner', inner, 8],
    ] as [string, string, number][]
  ).map(([id, stroke, strokeWidth]) => ({
    id,
    surface: 'collar' as const,
    d: VIKINGS_COLLAR_PATH,
    clip: true,
    kind: 'stroke' as const,
    stroke,
    strokeWidth,
  }));
}

// Horn then crescent, both evenodd — a bold solid shape survives the small source where a thin
// keyline would not.
function decal(horn: string, crescent: string): PartLayer[] {
  return (
    [
      ['vikings-decal-horn', VIKINGS_DECAL_HORN_PATH, horn],
      ['vikings-decal-crescent', VIKINGS_DECAL_CRESCENT_PATH, crescent],
    ] as [string, string, string][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fillRule: 'evenodd' as const,
    fill,
  }));
}

// The modern purple shell (H1), worn by home and away: white horn over a gold crescent, black
// cage. Every purple helmet figure on the GUD 2025 composite (nfl-uniform-refs/vikings) wears a
// black facemask.
const HELMET_PURPLE: UniformPart = {
  base: 'purple',
  facemask: 'black',
  layers: decal('white', 'gold'),
};

// The 1965 shell (H2) is the same purple with the same mark, and would be the same part but for
// the cage: the era sheet (vikings-purple-classic-era-1965.png) shows a single-bar GREY facemask,
// not the modern black one. It is left on GENERIC_UNIFORM_STYLE's shared neutral rather than given
// an eyedropped hex — the era sheet's bar samples around #9ea099/#969696, which is antialiasing
// against a white ground and not a documented color. This is the ticket's "leave a shell on the
// default rather than inventing a hex" case, and it is the one open question in this PR.
const HELMET_PURPLE_CLASSIC: UniformPart = { base: 'purple', layers: decal('white', 'gold') };

// Winter Warrior's white shell (H3): purple horn over a gold crescent, and a white cage to match
// the shell, as the composite draws it.
const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: decal('purple', 'gold'),
};

// Purple jersey (J1) — home and the 1965 classic. White over gold on the sleeve, a white-over-gold
// collar, white numerals with a gold keyline.
const JERSEY_PURPLE: UniformPart = {
  base: 'purple',
  layers: [...sleeveBands('white', 'gold'), ...collar('white', 'gold')],
  number: { fill: 'white', outline: 'gold', outlineWidth: 14 },
};

// White jersey (J2) — away and Winter Warrior. The bands invert to purple over gold so the upper
// one reads against the body.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: [...sleeveBands('purple', 'gold'), ...collar('purple', 'gold')],
  number: { fill: 'purple', outline: 'gold', outlineWidth: 14 },
};

// Home pants (P1): purple, white outside gold.
const PANTS_PURPLE_WHITE: UniformPart = {
  base: 'purple',
  layers: pantsStripes('white', 'gold'),
};

// Away pants (P2): the same purple, but the stripe order flips to gold outside white — which is
// why this is a second part and not a reuse of P1.
const PANTS_PURPLE_GOLD: UniformPart = {
  base: 'purple',
  layers: pantsStripes('gold', 'white'),
};

// White pants (P3) — the 1965 classic and Winter Warrior both wear them, purple outside gold.
const PANTS_WHITE: UniformPart = {
  base: 'white',
  layers: pantsStripes('purple', 'gold'),
};

export const VIKINGS_PARTS: TeamPartsDefinition = {
  teamId: 'vikings',
  // Jersey hexes from the curated rows (lib/uniforms/data.ts).
  palette: {
    purple: '#4F2683',
    gold: '#FFC62F',
    white: '#FFFFFF',
    black: '#000000',
  },
  helmets: { purple: HELMET_PURPLE, classic: HELMET_PURPLE_CLASSIC, white: HELMET_WHITE },
  jerseys: { purple: JERSEY_PURPLE, white: JERSEY_WHITE },
  pants: { purpleWhite: PANTS_PURPLE_WHITE, purpleGold: PANTS_PURPLE_GOLD, white: PANTS_WHITE },
  kits: {
    home: { helmet: 'purple', jersey: 'purple', pants: 'purpleWhite' },
    away: { helmet: 'purple', jersey: 'white', pants: 'purpleGold' },
    'winter-warrior': { helmet: 'white', jersey: 'white', pants: 'white' },
    'purple-classic': { helmet: 'classic', jersey: 'purple', pants: 'white' },
  },
};

export const VIKINGS_UNIFORMS_FROM_PARTS = compileParts(VIKINGS_PARTS);
