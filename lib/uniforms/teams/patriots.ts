// New England's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/patriots (home is that sheet's row-2 figure 3, away its row-1 figure 1, Pat
// Patriot its row-1 figure 7 — boxed "worn in same games"). Right paths mirror the left across the
// centerline x=294.
//
// One construction throughout: three parallel bands running diagonally down each shoulder cap,
// outer/inner/outer, and nothing else. No collar trim, no helmet stripe, no pant stripe.
//
// The band COLORS are measured on three of the four kits and they are not a simple token swap:
// navy body wears red/white/red, white body wears red/navy/red, red body wears white/navy/white.
// So both the outer and inner colors are parameters — assuming either one is fixed renders one of
// the kits wrong, the same trap Denver's shoulder wedge sets.
//
// THE RIVALRIES KIT IS INFERRED — no figure of its own on the sheet. It takes the home pattern
// against its own palette.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "WE ARE ALL PATRIOTS"
// collar tab, the Super Bowl and USA-250 patches, the logo on each sleeve, and shoulder numerals.
//
// Construction geometry only — the band and mark paths. The composable parts definition that
// consumes them lives in ./patriots.parts.ts; the former flat PATRIOTS_UNIFORMS was deleted in the
// migration that proved parts render byte-identically (see parts-parity.test.ts for the one-time
// gate).

// The shoulder bands, measured on the home figure (jersey top y=901, sleeve hem y=967, figure center
// x=714.5, so scaleY = 191/66 and scaleX = 264/84.5). At reference y=913 the three run x650-656,
// x657-662 and x662-667; by y=937 each has shifted about 7px right, which is the slant. The set
// spans y908-938. Each band is ~19 units wide and leans ~22 units right over its 90-unit drop.
export const PATRIOTS_BANDS_LEFT = [
  'M92,404 L111,404 L133,493 L114,493 Z',
  'M111,404 L130,404 L152,493 L133,493 Z',
  'M130,404 L149,404 L171,493 L152,493 Z',
];
export const PATRIOTS_BANDS_RIGHT = [
  'M496,404 L477,404 L455,493 L474,493 Z',
  'M477,404 L458,404 L436,493 L455,493 Z',
  'M458,404 L439,404 L417,493 L436,493 Z',
];

// Provenance: contour trace of the approved standalone club mark, not the GUD composite. The mark is
// NON-FREE upstream (Wikimedia `File:New England Patriots logo.svg`, fair use; trademarked). Licence
// audit: the vault's Decisions.md, 2026-09-03. The generator in scripts/uniform-draw/patriots_mark.py
// rasterizes that source at its true aspect, measures topology, and emits these paths mechanically.
// The GUD composite supplies placement only; no source image or SVG is committed.
//
// Measured topology: one navy face component, two red streamer components, one silver face component,
// one white keyline component, and one separate white star component; no enclosed holes. White is
// split by component because the keyline and star share an ink color. All paths use the same source
// art bbox so the component positions remain aligned in the raw helmet-space placement box.
export const PATRIOTS_DECAL_KEYLINE_PATH =
  'M345.3,130.1 L377.9,130.1 L394.3,131.6 L417.7,136.3 L447.6,147.2 L458.5,149.8 L469.3,150.3 L484.0,147.7 L487.3,148.8 L487.8,153.9 L465.0,213.1 L463.3,215.2 L449.7,221.4 L452.5,241.1 L442.7,245.8 L440.5,250.9 L441.6,254.6 L441.6,260.3 L439.4,266.0 L435.6,271.2 L429.6,275.8 L420.9,279.0 L396.4,250.4 L386.1,240.6 L372.0,229.2 L356.7,219.3 L341.5,211.5 L320.3,203.2 L303.4,198.6 L299.6,196.5 L298.0,192.3 L299.1,189.7 L301.3,188.2 L300.7,187.7 L281.1,189.2 L253.4,188.2 L241.4,186.1 L234.9,183.5 L232.7,181.4 L232.2,177.3 L215.3,178.8 L193.5,178.8 L170.7,175.7 L165.3,172.6 L164.2,170.5 L165.3,166.4 L171.2,163.8 L182.7,162.8 L205.5,158.6 L291.5,137.3 L326.8,131.6 L344.8,130.6 Z';
export const PATRIOTS_DECAL_FACE_PATH =
  'M345.9,136.3 L377.4,136.3 L397.5,138.4 L413.8,142.0 L451.9,155.0 L462.8,156.5 L469.9,156.5 L479.7,155.0 L458.5,210.5 L442.1,217.2 L444.9,237.5 L436.1,241.6 L436.1,245.8 L432.9,252.0 L434.5,255.6 L434.5,259.2 L430.7,266.5 L423.1,271.2 L406.2,250.9 L389.4,234.3 L379.0,226.0 L364.3,216.2 L334.4,201.7 L315.9,195.4 L306.7,193.4 L315.9,192.3 L345.9,186.1 L375.2,185.6 L366.0,180.9 L354.6,177.8 L344.2,176.8 L329.0,177.3 L326.8,163.3 L343.1,161.2 L357.8,160.7 L345.3,156.5 L338.2,155.5 L325.2,155.5 L322.5,138.4 L345.3,136.8 Z';
export const PATRIOTS_DECAL_STREAMERS_PATH =
  'M318.1,138.9 L319.2,139.4 L321.9,155.5 L299.6,158.1 L257.7,166.9 L225.1,171.6 L189.7,172.1 L171.8,170.0 L199.5,165.9 L231.6,158.6 L279.5,146.2 L307.8,140.5 L317.6,139.4 Z M323.6,163.8 L326.3,178.3 L282.2,183.0 L259.9,182.5 L241.4,179.9 L250.1,179.9 L265.9,177.8 L323.0,164.3 Z';
export const PATRIOTS_DECAL_SILVER_PATH =
  'M405.1,204.3 L416.0,205.3 L421.5,208.4 L416.0,208.4 L411.7,210.0 L406.8,215.2 L406.8,217.2 L426.4,218.3 L428.5,213.6 L431.3,211.0 L434.0,210.0 L436.7,210.5 L439.4,233.8 L428.5,233.3 L426.4,235.9 L432.3,238.5 L432.3,241.1 L425.8,241.6 L418.7,246.3 L432.9,245.8 L430.2,249.9 L424.7,249.9 L430.2,256.7 L428.5,262.4 L424.7,265.0 L404.6,241.1 L394.3,231.8 L385.0,225.0 L389.4,222.4 L396.4,223.5 L401.3,226.6 L409.5,236.9 L410.6,238.0 L411.1,237.5 L409.0,226.0 L391.0,211.5 L395.4,206.9 L401.3,204.8 L404.6,204.8 Z';
export const PATRIOTS_DECAL_STAR_PATH =
  'M444.9,162.8 L446.5,174.7 L460.6,179.9 L448.1,182.5 L447.0,183.5 L448.7,199.1 L437.2,185.6 L419.8,189.2 L430.2,177.8 L421.5,166.4 L436.7,171.1 L444.3,163.3 Z';
