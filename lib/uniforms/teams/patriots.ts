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
  'M320.3,130.1 L352.9,130.1 L369.3,131.6 L392.7,136.3 L422.6,147.2 L433.5,149.8 L444.3,150.3 L459.0,147.7 L462.3,148.8 L462.8,153.9 L440.0,213.1 L438.3,215.2 L424.7,221.4 L427.5,241.1 L417.7,245.8 L415.5,250.9 L416.6,254.6 L416.6,260.3 L414.4,266.0 L410.6,271.2 L404.6,275.8 L395.9,279.0 L371.4,250.4 L361.1,240.6 L347.0,229.2 L331.7,219.3 L316.5,211.5 L295.3,203.2 L278.4,198.6 L274.6,196.5 L273.0,192.3 L274.1,189.7 L276.3,188.2 L275.7,187.7 L256.1,189.2 L228.4,188.2 L216.4,186.1 L209.9,183.5 L207.7,181.4 L207.2,177.3 L190.3,178.8 L168.5,178.8 L145.7,175.7 L140.3,172.6 L139.2,170.5 L140.3,166.4 L146.2,163.8 L157.7,162.8 L180.5,158.6 L266.5,137.3 L301.8,131.6 L319.8,130.6 Z';
export const PATRIOTS_DECAL_FACE_PATH =
  'M320.9,136.3 L352.4,136.3 L372.5,138.4 L388.8,142.0 L426.9,155.0 L437.8,156.5 L444.9,156.5 L454.7,155.0 L433.5,210.5 L417.1,217.2 L419.9,237.5 L411.1,241.6 L411.1,245.8 L407.9,252.0 L409.5,255.6 L409.5,259.2 L405.7,266.5 L398.1,271.2 L381.2,250.9 L364.4,234.3 L354.0,226.0 L339.3,216.2 L309.4,201.7 L290.9,195.4 L281.7,193.4 L290.9,192.3 L320.9,186.1 L350.2,185.6 L341.0,180.9 L329.6,177.8 L319.2,176.8 L304.0,177.3 L301.8,163.3 L318.1,161.2 L332.8,160.7 L320.3,156.5 L313.2,155.5 L300.2,155.5 L297.5,138.4 L320.3,136.8 Z';
export const PATRIOTS_DECAL_STREAMERS_PATH =
  'M293.1,138.9 L294.2,139.4 L296.9,155.5 L274.6,158.1 L232.7,166.9 L200.1,171.6 L164.7,172.1 L146.8,170.0 L174.5,165.9 L206.6,158.6 L254.5,146.2 L282.8,140.5 L292.6,139.4 Z M298.6,163.8 L301.3,178.3 L257.2,183.0 L234.9,182.5 L216.4,179.9 L225.1,179.9 L240.9,177.8 L298.0,164.3 Z';
export const PATRIOTS_DECAL_SILVER_PATH =
  'M380.1,204.3 L391.0,205.3 L396.5,208.4 L391.0,208.4 L386.7,210.0 L381.8,215.2 L381.8,217.2 L401.4,218.3 L403.5,213.6 L406.3,211.0 L409.0,210.0 L411.7,210.5 L414.4,233.8 L403.5,233.3 L401.4,235.9 L407.3,238.5 L407.3,241.1 L400.8,241.6 L393.7,246.3 L407.9,245.8 L405.2,249.9 L399.7,249.9 L405.2,256.7 L403.5,262.4 L399.7,265.0 L379.6,241.1 L369.3,231.8 L360.0,225.0 L364.4,222.4 L371.4,223.5 L376.3,226.6 L384.5,236.9 L385.6,238.0 L386.1,237.5 L384.0,226.0 L366.0,211.5 L370.4,206.9 L376.3,204.8 L379.6,204.8 Z';
export const PATRIOTS_DECAL_STAR_PATH =
  'M419.9,162.8 L421.5,174.7 L435.6,179.9 L423.1,182.5 L422.0,183.5 L423.7,199.1 L412.2,185.6 L394.8,189.2 L405.2,177.8 L396.5,166.4 L411.7,171.1 L419.3,163.3 Z';
