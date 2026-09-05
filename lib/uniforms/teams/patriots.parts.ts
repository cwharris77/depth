// New England authored as composable parts. Geometry is imported unchanged from patriots.ts —
// this file only restates WHICH parts each kit combines, and names every color from the team
// palette instead of the kit row's shifting primary/secondary/accent.
//
// One construction throughout: three parallel bands running diagonally down each shoulder cap,
// outer/inner/outer, and nothing else. No collar trim, no helmet stripe, no pant stripe.
//
// The measured target is 4 helmet / 4 jersey / 4 pants — every kit its own parts, nothing shared,
// and that is what this factors to. New England is the one team in the epic where the parts model
// buys no deduplication at all, and that is the honest answer rather than a failure to look: the
// band colors are not a token swap (navy body wears red/white/red, white body red/navy/red, red
// body white/navy/white), the four kits carry four different body colors, and two different navies
// are in play — #002244 on home/away and #002F6C on Rivalries and Pat Patriot. What the migration
// does buy here is the palette: those two navies and two reds (#C60C30, #C8102E) are now named and
// impossible to confuse, where the flat form left them scattered across primary/secondary/accent.
//
// Pat Patriot carries NO helmet mark — that era wore a different logo, which no figure on the
// sheet draws.

import {
  PATRIOTS_BANDS_LEFT,
  PATRIOTS_BANDS_RIGHT,
  PATRIOTS_DECAL_FACE_PATH,
  PATRIOTS_DECAL_KEYLINE_PATH,
  PATRIOTS_DECAL_STAR_PATH,
  PATRIOTS_DECAL_STREAMERS_PATH,
} from './patriots';
import { compileParts, type PartLayer, type TeamPartsDefinition, type UniformPart } from './parts';
import type { UniformSurface } from './types';

// Three bands per shoulder; the middle one takes the inner color, the outer two the outer color.
function shoulderBands(outer: string, inner: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, string[]][] = [
    ['sleeve-left', PATRIOTS_BANDS_LEFT],
    ['sleeve-right', PATRIOTS_BANDS_RIGHT],
  ];

  for (const [surface, paths] of sides) {
    const side = surface === 'sleeve-left' ? 'left' : 'right';
    paths.forEach((d, i) => {
      out.push({
        id: `patriots-band-${i}-${side}`,
        surface,
        d,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? inner : outer,
      });
    });
  }

  return out;
}

// Keyline, face, streamers, star — fixed art on every shell that carries the modern mark.
function decal(): PartLayer[] {
  return (
    [
      ['patriots-decal-keyline', PATRIOTS_DECAL_KEYLINE_PATH, 'white'],
      ['patriots-decal-face', PATRIOTS_DECAL_FACE_PATH, 'navy'],
      ['patriots-decal-streamers', PATRIOTS_DECAL_STREAMERS_PATH, 'red'],
      ['patriots-decal-star', PATRIOTS_DECAL_STAR_PATH, 'white'],
    ] as [string, string, string][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

// Home shell (H1). The cage is red on every silver-shell figure of the GUD 2025 composite
// (nfl-uniform-refs/patriots) — vividly so, and it is the club's signature facemask. The sheet is
// a GIF and its cage quantizes to #e30003, which is palette noise rather than a documented color,
// so this uses the archive's own stored club red (#C60C30, the home row's secondary) instead of
// eyedropping the source.
const HELMET_NAVY: UniformPart = { base: 'navy', facemask: 'red', layers: decal() };

// Away shell (H2): silver, same mark, same red cage.
const HELMET_SILVER: UniformPart = { base: 'silver', facemask: 'red', layers: decal() };

// Pat Patriot shell (H3): the throwback red shell, and NO mark — that era wore a different logo,
// which no figure on the sheet draws. Its white-shell figure in the boxed group wears a white cage.
const HELMET_PAT: UniformPart = { base: 'patRed', facemask: 'white', layers: [] };

// Rivalries shell (H4). The kit has no figure of its own on the sheet — the flat definition called
// it inferred and this migration does not change that — so there is no cage to source and the
// shell stays on GENERIC_UNIFORM_STYLE's shared neutral rather than borrowing the red one.
const HELMET_RIVALRIES: UniformPart = { base: 'rivalNavy', layers: decal() };

// Home jersey (J1): navy body, banded red/white/red, white numerals.
const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: shoulderBands('red', 'white'),
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};

// Away jersey (J2): white body, banded red/navy/red — the inner band picks up the body's contrast
// rather than staying white.
const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: shoulderBands('red', 'navy'),
  number: { fill: 'navy', outline: 'red', outlineWidth: 14 },
};

// Pat Patriot jersey (J3): red body, banded white/navy/white against it.
const JERSEY_PAT: UniformPart = {
  base: 'patRed',
  layers: shoulderBands('white', 'rivalNavy'),
  number: { fill: 'white', outline: 'rivalNavy', outlineWidth: 14 },
};

// Rivalries jersey (J4): the home pattern against its own navy.
const JERSEY_RIVALRIES: UniformPart = {
  base: 'rivalNavy',
  layers: shoulderBands('red', 'white'),
  number: { fill: 'white', outline: 'red', outlineWidth: 14 },
};

// Pants — unbroken on every kit; each simply takes its body color.
const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };
const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
const PANTS_PAT: UniformPart = { base: 'patRed', layers: [] };
const PANTS_RIVALRIES: UniformPart = { base: 'rivalNavy', layers: [] };

export const PATRIOTS_PARTS: TeamPartsDefinition = {
  teamId: 'patriots',
  // Jersey hexes from the curated rows (lib/uniforms/data.ts). Two navies and two reds are real
  // and distinct: home/away use #002244 and #C60C30, Rivalries and Pat Patriot #002F6C and
  // #C8102E. Naming them is the point — the flat form left them indistinguishable behind tokens.
  palette: {
    navy: '#002244',
    rivalNavy: '#002F6C',
    red: '#C60C30',
    patRed: '#C8102E',
    silver: '#B0B7BC',
    white: '#FFFFFF',
  },
  helmets: {
    navy: HELMET_NAVY,
    silver: HELMET_SILVER,
    pat: HELMET_PAT,
    rivalries: HELMET_RIVALRIES,
  },
  jerseys: {
    navy: JERSEY_NAVY,
    white: JERSEY_WHITE,
    pat: JERSEY_PAT,
    rivalries: JERSEY_RIVALRIES,
  },
  pants: { navy: PANTS_NAVY, white: PANTS_WHITE, pat: PANTS_PAT, rivalries: PANTS_RIVALRIES },
  kits: {
    home: { helmet: 'navy', jersey: 'navy', pants: 'navy' },
    away: { helmet: 'silver', jersey: 'white', pants: 'white' },
    'pat-patriot': { helmet: 'pat', jersey: 'pat', pants: 'pat' },
    'rivalries-2025': { helmet: 'rivalries', jersey: 'rivalries', pants: 'rivalries' },
  },
};

export const PATRIOTS_UNIFORMS_FROM_PARTS = compileParts(PATRIOTS_PARTS);
