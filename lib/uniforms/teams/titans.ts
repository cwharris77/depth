// Tennessee's construction geometry — the circle-T decal paths, the silver shoulder yoke, and
// the fixed construction colors only. The composable parts definition that consumes them lives in
// ./titans.parts.ts; the former flat TITANS_UNIFORMS was deleted in the migration that proved
// parts render byte-identically (see parts-parity.test.ts for the one-time gate).
//
// NOTE: the stored palettes predate the 2025 rebrand (only `away` can be verified against a
// figure). This module preserves the existing render; it does not re-derive token assignments.

// Silver is a literal on every kit, because no Titans palette carries it. The reference renders the
// yoke around (144,144,143); this uses the hex the archive already stores as silver elsewhere
// (lib/uniforms/data.ts), which reads very slightly lighter.
export const TITANS_SILVER = '#A5ACAF';
export const TITANS_WHITE = '#FFFFFF';

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Tennessee Titans Logo 2026.svg`, fair use; trademarked). Licence audit: the
// vault’s Decisions.md, 2026-09-03.
//
// The circle-T: the three rings are CONCENTRIC CIRCLES fitted to the measured disc; the T and the
// three stars ARE traced. THE FLAME TAIL IS DROPPED (a four-color interleave about two px per band).
// Re-derive the whole mark from a larger source before treating it as finished.
export const TITANS_DECAL_RING_OUTER_PATH =
  'M328.9,237.0 A75.0,75.0 0 1 0 478.9,237.0 A75.0,75.0 0 1 0 328.9,237.0 Z';
export const TITANS_DECAL_RING_INNER_PATH =
  'M336.9,237.0 A67.0,67.0 0 1 0 470.9,237.0 A67.0,67.0 0 1 0 336.9,237.0 Z';
export const TITANS_DECAL_FIELD_PATH =
  'M344.9,237.0 A59.0,59.0 0 1 0 462.9,237.0 A59.0,59.0 0 1 0 344.9,237.0 Z';
export const TITANS_DECAL_T_PATH =
  'M450.8,210.1 L453.5,212.2 L449.1,224.4 L441.5,217.0 L424.0,217.0 L419.6,219.5 L412.4,256.1 L405.3,271.5 L406.6,212.2 L450.4,210.5 Z M361.9,210.1 L400.4,211.8 L393.7,218.3 L371.3,217.0 L362.4,223.6 L358.8,213.0 L361.5,210.5 Z M383.8,167.9 L393.7,169.5 L377.1,173.1 L351.7,189.4 L366.9,174.0 L383.4,168.3 Z';
export const TITANS_DECAL_STARS_PATH =
  'M441.0,243.1 L454.0,249.2 L454.0,257.7 L445.0,259.7 L435.7,256.1 L441.5,250.8 L440.6,243.5 Z M367.3,243.9 L369.5,251.2 L375.3,255.3 L367.7,263.4 L356.6,255.7 L357.9,249.6 L366.9,244.3 Z M404.4,178.8 L415.1,186.1 L409.7,195.9 L402.1,194.3 L395.4,187.4 L403.9,179.2 Z';
// No Titans palette carries the mark's red either — same reason as the silver above.
export const TITANS_DECAL_RED = '#C8102E';
export const TITANS_DECAL_LIGHT_BLUE = '#4B92DB';

// The shoulder yoke — silver covers the whole shoulder cap and tapers down the sleeve to a point;
// the navy bar inside it runs reference x45-65 at y142-149.
export const TITANS_YOKE_LEFT = 'M30,386 L205,412 L36,548 Z';
export const TITANS_YOKE_RIGHT = 'M558,386 L383,412 L552,548 Z';
export const TITANS_BAR_LEFT = 'M96,415 H158 V435 H96 Z';
export const TITANS_BAR_RIGHT = 'M492,415 H430 V435 H492 Z';
