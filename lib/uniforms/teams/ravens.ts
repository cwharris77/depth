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
//
// Construction geometry only — the shoulder-bar, sleeve-band and mark paths. The composable parts
// definition that consumes them lives in ./ravens.parts.ts; the former flat RAVENS_UNIFORMS was
// deleted in the migration that proved parts render byte-identically (see parts-parity.test.ts for
// the one-time gate).

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

// The decal itself is generated from the supplied club SVG in ./ravens-decal.ts. Keeping it separate
// makes the direct source-to-helmet transform independently reproducible without mixing it into jersey geometry.
