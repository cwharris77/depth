// Jacksonville's construction geometry — the jaguar-head decal paths, the sleeve-band and collar
// paths, and the construction color literals only. The composable parts definition that consumes
// them lives in ./jaguars.parts.ts; the former flat JAGUARS_UNIFORMS was deleted in the migration
// that proved parts render byte-identically (see parts-parity.test.ts for the one-time gate).

// Two literals. Only the throwback's palette carries black — the home and away palettes are
// teal/gold/gold and white/teal/gold respectively, so neither can resolve the shell, the sleeve
// bands or the collar. And no kit's palette carries white, which every current kit needs.
export const JAGUARS_BLACK = '#101820';
export const JAGUARS_WHITE = '#FFFFFF';

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Jacksonville Jaguars logo.svg`, fair use; trademarked). Licence audit: the
// vault’s Decisions.md, 2026-09-03.
//
// The jaguar head: white jaw, gold crown, teal tongue — three plain-union fills. The crown spots
// are the shell color, so they fall out as gaps between components; that trick only works on a
// BLACK shell, which is why the decal is only on the black shells.
export const JAGUARS_DECAL_JAW_PATH =
  'M437.1,214.0 L447.4,214.5 L450.4,218.0 L466.1,219.7 L469.0,223.6 L482.3,225.4 L481.3,227.6 L472.5,227.6 L463.1,223.1 L450.4,223.1 L443.0,231.6 L438.6,252.1 L447.4,282.8 L458.7,300.4 L464.6,306.1 L470.5,307.2 L483.8,306.7 L491.1,301.5 L505.4,302.1 L505.9,304.4 L497.0,313.5 L490.1,318.6 L482.3,320.3 L467.6,318.6 L454.3,307.2 L440.1,282.2 L433.2,274.8 L409.1,261.7 L409.1,259.5 L422.4,261.7 L429.2,266.3 L434.6,261.7 L435.6,254.9 L427.3,249.8 L409.6,249.8 L412.1,240.1 L398.3,231.6 L406.2,229.9 L414.0,233.9 L421.4,221.4 L420.9,216.8 L432.2,217.4 L436.6,214.5 Z M510.3,224.2 L517.6,225.4 L526.5,232.7 L526.5,236.7 L500.0,247.5 L494.6,247.5 L485.2,241.3 L486.7,239.0 L496.0,242.4 L497.0,235.0 L513.2,234.5 L514.7,231.0 L510.3,224.8 Z M356.6,174.2 L375.7,183.8 L376.7,186.1 L371.3,189.5 L372.8,192.4 L388.5,193.5 L390.9,196.4 L369.8,196.4 L356.6,179.9 L356.1,174.7 Z M548.6,225.9 L551.5,234.5 L548.6,241.8 L537.3,241.8 L535.3,235.6 L540.2,234.5 L548.1,226.5 Z';
export const JAGUARS_DECAL_CROWN_PATH =
  'M442.5,153.7 L451.3,154.8 L455.3,161.1 L467.1,154.8 L472.0,157.7 L478.8,169.1 L475.9,176.5 L465.6,177.6 L464.6,181.0 L461.2,181.0 L458.7,186.7 L454.3,187.8 L452.8,191.2 L460.7,204.3 L474.9,208.9 L478.4,206.0 L483.3,208.9 L483.8,211.7 L473.0,218.5 L460.7,216.8 L472.5,212.3 L471.5,208.9 L459.7,209.4 L455.3,214.0 L437.6,211.7 L423.8,214.0 L428.3,212.8 L429.7,209.4 L419.4,197.5 L415.5,203.7 L418.9,212.8 L417.0,214.5 L418.0,222.5 L408.6,212.8 L403.7,212.8 L401.7,215.7 L403.7,227.6 L398.3,227.1 L394.4,232.7 L390.0,232.2 L392.4,238.4 L390.9,243.0 L387.0,244.1 L386.5,228.8 L382.6,227.1 L383.1,220.2 L377.7,215.7 L379.2,205.5 L387.0,203.2 L394.9,194.1 L403.7,191.2 L406.7,197.5 L413.0,198.1 L417.5,192.9 L418.4,187.3 L415.0,183.8 L395.9,186.1 L385.0,182.1 L382.1,179.9 L382.6,168.5 L395.4,163.9 L403.2,167.4 L406.2,162.8 L419.9,157.1 L431.7,160.5 L442.0,154.3 Z M489.7,158.3 L494.1,158.3 L504.9,166.2 L510.8,177.0 L516.2,171.9 L520.1,172.5 L523.0,177.6 L531.9,183.3 L536.3,189.0 L535.3,191.8 L529.4,187.8 L525.5,187.8 L524.5,190.7 L535.3,200.3 L537.8,212.8 L542.2,210.6 L545.1,212.3 L543.7,219.1 L535.3,222.5 L530.9,218.5 L503.9,213.4 L502.4,215.1 L505.9,218.5 L502.4,220.8 L510.3,229.9 L505.4,232.7 L505.4,225.4 L499.5,223.6 L496.5,218.0 L491.1,217.4 L486.2,223.1 L478.8,221.9 L489.2,215.7 L486.7,204.9 L491.1,202.6 L496.5,203.7 L499.0,207.7 L509.8,208.3 L514.2,212.8 L518.1,211.1 L510.8,200.9 L511.8,194.1 L509.3,188.4 L505.4,190.1 L502.4,199.2 L498.0,199.8 L482.3,191.8 L483.8,185.0 L479.3,187.8 L483.8,181.0 L483.3,174.2 L488.2,166.2 L489.2,158.8 Z';
export const JAGUARS_DECAL_TONGUE_PATH =
  'M454.8,238.4 L461.2,240.1 L469.0,250.9 L469.5,272.0 L471.5,275.4 L474.4,274.3 L474.9,269.7 L474.9,252.6 L471.5,243.5 L473.4,243.0 L478.8,250.4 L479.3,271.4 L485.2,284.5 L482.8,287.9 L478.8,287.9 L475.9,295.3 L471.0,294.2 L462.2,281.6 L461.2,256.1 L454.3,239.0 Z';

// Fixed art on the black shell; the teal has no token on the home palette and the gold none on the
// throwback's, so pinning both is simpler than threading them per kit.
export const JAGUARS_DECAL_GOLD = '#D7A22A';
export const JAGUARS_DECAL_TEAL = '#006778';

// The sleeve bands, authored as ONE band (the mannequin does not draw the hem outline that splits
// them in the reference).
export const JAGUARS_BAND_LEFT = 'M30,525 L61,525 L130,542 L130,576 L30,576 Z';
export const JAGUARS_BAND_RIGHT = 'M558,525 L527,525 L458,542 L458,576 L558,576 Z';
export const JAGUARS_TB_BAND_UPPER_LEFT = 'M30,536 H93 V555 H30 Z';
export const JAGUARS_TB_BAND_UPPER_RIGHT = 'M558,536 H495 V555 H558 Z';
export const JAGUARS_TB_BAND_LOWER_LEFT = 'M30,555 H130 V576 H30 Z';
export const JAGUARS_TB_BAND_LOWER_RIGHT = 'M558,555 H458 V576 H558 Z';

// The current kits' collar is two short arcs (the arms never meet); the throwback's is a closing V.
export const JAGUARS_COLLAR_ARC_LEFT = 'M197,391 L196,420 L218,456';
export const JAGUARS_COLLAR_ARC_RIGHT = 'M391,391 L392,420 L370,456';
export const JAGUARS_COLLAR_ARC_WIDTH = 12;
export const JAGUARS_TB_COLLAR_PATH = 'M180,418 L292,476 L408,418';
export const JAGUARS_TB_COLLAR_WIDTH = 26;
