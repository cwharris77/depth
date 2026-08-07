import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Baltimore's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/ravens (home is that sheet's row-1 figure 1, black alternate its row-2 figure 3,
// away its row-3 figure 1 — the other figures in each row are pant combinations, not separate
// kits). Sleeve paths use the outer 588-wide mannequin space; right paths mirror the left across
// the centerline x=294 (mirroredX = 588 - x).
//
// All three kits are ONE construction with the tokens swapped: a bare black shell, a short tilted
// bar on each shoulder cap, a solid band filling the last third of each sleeve, and trimmed
// numerals. No helmet stripe, no collar trim, no pant stripe — the reference's pants are unbroken
// on every combination, and the black/white/black stripe in the swatch beside each figure is the
// sock, not the pant (the same swatch convention the Chiefs sheet uses).
//
// ONE APPROXIMATION, deliberate: the shoulder bar and the numerals both carry a black drop-shadow
// along their lower-right edge, under the gold keyline. At the 188px swatch this renders sub-pixel,
// so the bar is authored as gold-under-white and the numeral shadow is dropped entirely. The gold
// keyline is what actually reads at size, and it is preserved on both.
//
// Out of scope on every kit: the chest wordmark, the league shield, and the shield patch the
// reference draws on each sleeve.

// Two literals. The home palette is purple over black with gold in accent, so nothing resolves to
// the white bar face or the white numerals; and the AWAY palette (white/purple/gold) carries no
// black at all, so its shell and sleeve band have no token either. Both hexes are the values the
// archive already stores for this club's other kits (lib/uniforms/data.ts).
export const RAVENS_WHITE = '#FFFFFF';
export const RAVENS_BLACK = '#000000';

// The shoulder bar, measured on the home figure (jersey top y=132, sleeve hem y=197, figure center
// x=99.5, so scaleY = 191/65 and scaleX = 264/84.5). It runs reference x35-59 and is tilted about
// 4px over that 24px length, which is the shoulder slope. Thickness is taken from the mid-bar
// column at x=47, the only cut that crosses every layer cleanly: gold y144-149 around a white face
// at y145-148. Reading the bar's full outer boundary instead gives y145-151, but that lower 2px is
// the black drop-shadow, not gold — folding it in renders the keyline at twice its weight and the
// bar reads gold-with-a-white-slot rather than white-with-a-gold-keyline.
export const RAVENS_SHOULDER_OUTER_LEFT = 'M93,424 L168,412 L168,427 L93,439 Z';
export const RAVENS_SHOULDER_OUTER_RIGHT = 'M495,424 L420,412 L420,427 L495,439 Z';
export const RAVENS_SHOULDER_INNER_LEFT = 'M99,427 L164,415 L164,424 L99,436 Z';
export const RAVENS_SHOULDER_INNER_RIGHT = 'M489,427 L424,415 L424,424 L489,436 Z';

// The sleeve band, measured on the same figure: reference x19-48 (mirrored x153-181 on the right,
// which is within 2px of the computed mirror) and y188-197, so it ends flush with the hem. Extended
// outward to x=30 and past the hem to y=576 so the jersey clip trims it flush.
export const RAVENS_SLEEVE_BAND_LEFT = 'M30,548 H133 V576 H30 Z';
export const RAVENS_SLEEVE_BAND_RIGHT = 'M558,548 H455 V576 H558 Z';

const GENERIC_STRIPPED = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
  'generic-collar',
  'generic-pants-stripe-left',
  'generic-pants-stripe-right',
];

// The shell carries no mark on any kit. The club's raven head is a two-pixel gold keyline that
// snakes around a purple head, with a white "B" letterform and a white beak inside it — at the
// reference's 84x42px it is entirely sub-3px stroke detail, which is the failure mode that shredded
// the Seahawks keyline and the Falcons falcon. An illegible trace is worse than none, so the shell
// is left bare until there is original stylized geometry to put on it.

// Gold keyline first, face over it — the same paint order every trimmed mark here uses.
function shoulderBars(face: ColorRef): UniformLayer[] {
  const bars: [string, UniformSurface, string, ColorRef][] = [
    ['ravens-shoulder-outer-left', 'sleeve-left', RAVENS_SHOULDER_OUTER_LEFT, 'accent'],
    ['ravens-shoulder-outer-right', 'sleeve-right', RAVENS_SHOULDER_OUTER_RIGHT, 'accent'],
    ['ravens-shoulder-inner-left', 'sleeve-left', RAVENS_SHOULDER_INNER_LEFT, face],
    ['ravens-shoulder-inner-right', 'sleeve-right', RAVENS_SHOULDER_INNER_RIGHT, face],
  ];
  return bars.map(([id, surface, d, fill]) => ({ id, surface, d, clip: true, kind: 'fill', fill }));
}

function sleeveBands(fill: ColorRef): UniformLayer[] {
  return [
    ['ravens-sleeve-band-left', 'sleeve-left', RAVENS_SLEEVE_BAND_LEFT],
    ['ravens-sleeve-band-right', 'sleeve-right', RAVENS_SLEEVE_BAND_RIGHT],
  ].map(([id, surface, d]) => ({
    id,
    surface: surface as UniformSurface,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

export const RAVENS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'ravens',
  // Every kit strips the same generic model; what differs is only which token carries each color.
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Purple body over purple pants under the black shell. Black is `secondary` here, so the sleeve
    // band takes the token; the bar face and numeral face are white, which this palette cannot
    // supply, so both take the literal.
    home: {
      helmetColor: 'secondary',
      layers: [...shoulderBars(RAVENS_WHITE), ...sleeveBands('secondary')],
      number: { fill: RAVENS_WHITE, outline: 'accent', outlineWidth: 16 },
    },
    // White body over purple pants. The away palette moves white into primary and purple into
    // secondary, so the bar face and numeral face swap onto `secondary` and the black shell and
    // sleeve band — which this palette has no token for at all — take the literal.
    away: {
      helmetColor: RAVENS_BLACK,
      pantsColor: 'secondary',
      layers: [...shoulderBars('secondary'), ...sleeveBands(RAVENS_BLACK)],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 16 },
    },
    // Black body over purple pants. Black is this kit's primary, so the shell needs no override,
    // and purple has moved into secondary — which is what the reference paints the sleeve band.
    'black-alt': {
      pantsColor: 'secondary',
      layers: [...shoulderBars(RAVENS_WHITE), ...sleeveBands('secondary')],
      number: { fill: RAVENS_WHITE, outline: 'accent', outlineWidth: 16 },
    },
  },
};
