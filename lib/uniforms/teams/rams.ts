// Los Angeles' four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/rams (home is that sheet's row-1 figure 3, Rivalries its row-1 figure 7, away
// its row-2 figure 1, bone its row-2 figure 5). Sleeve paths use the outer 588-wide mannequin
// space; the helmet decal stays in raw helmet coordinates (x:139-802, y:65-674). Right paths mirror
// the left across the centerline x=294 (mirroredX = 588 - x).
//
// Every kit is the same construction: the horn on the shell, and on each sleeve a broad band that
// widens toward the hem with a thin tail splitting off toward the shoulder edge. No helmet stripe,
// no collar trim, no pant stripe. What changes between kits is only which token colors them —
// except on Rivalries, where the tail is royal against a yellow band rather than matching it.
//
// TWO APPROXIMATIONS, both deliberate and both about texture the flat-fill layer model cannot
// express:
//   1. The numerals on every kit carry a vertical gold-to-white ramp; they are painted here as the
//      flat color the ramp starts from.
//   2. The Rivalries numerals additionally carry a dot texture over that ramp; also flattened.
// These are two-stop ramps over otherwise solid shapes, so a flat fill reads as the right kit. A
// halftone panel — Washington's road sleeve, say — would not, and is a different judgement call.
//
// Out of scope on every kit: the chest wordmark, the league shield, and the Rivalries collar script.
//
// Construction geometry only — the horn and sleeve-mark paths. The composable parts definition
// that consumes them lives in ./rams.parts.ts; the former flat RAMS_UNIFORMS was deleted in the
// migration that proved parts render byte-identically (see parts-parity.test.ts for the one-time
// gate).

// The horn is the largest and most forgiving mark traced so far — one bold curl plus the thin
// upper tail, both solid, over an 84x80px source, so it needed no upsampling past 6x. Two
// components emitted into one path and painted as a union; nothing here needs a fill rule.
// Traced from the helmet bbox (x 465-571, y 80-177 in the reference) mapped onto the raw helmet
// space at ~6.2x.
export const RAMS_DECAL_HORN_PATH =
  'M385.8,179.0 L417.8,179.0 L434.3,184.1 L445.7,184.1 L456.0,190.4 L462.2,190.4 L468.4,195.5 L477.7,196.6 L477.7,200.7 L468.4,200.7 L464.3,197.6 L449.8,194.5 L434.3,194.5 L418.9,196.6 L410.6,200.7 L396.1,201.7 L393.0,205.9 L383.8,206.9 L378.6,212.1 L370.3,214.2 L366.2,219.4 L362.1,219.4 L357.9,224.5 L351.7,226.6 L347.6,231.8 L343.5,232.8 L342.4,237.0 L338.3,238.0 L337.3,241.1 L331.1,245.2 L328.0,251.5 L324.9,252.5 L322.8,258.7 L318.7,261.8 L317.7,267.0 L312.5,270.1 L310.4,279.4 L305.3,284.6 L305.3,289.8 L303.2,295.0 L300.1,297.0 L298.0,310.5 L292.9,322.9 L293.9,380.9 L299.1,390.2 L299.1,398.5 L304.2,404.7 L305.3,412.0 L310.4,418.2 L311.5,424.4 L316.6,428.5 L317.7,433.7 L323.9,439.9 L323.9,443.0 L328.0,445.1 L331.1,450.3 L343.5,460.7 L344.5,463.8 L347.6,463.8 L351.7,470.0 L356.9,471.0 L360.0,475.2 L365.2,476.2 L370.3,482.4 L375.5,482.4 L382.7,488.6 L392.0,489.7 L398.2,494.8 L408.5,495.9 L417.8,501.0 L429.2,501.0 L446.7,506.2 L465.3,506.2 L487.0,501.0 L502.5,501.0 L513.8,494.8 L525.2,493.8 L528.3,489.7 L535.5,488.6 L540.7,483.4 L546.9,482.4 L550.0,477.2 L555.2,479.3 L559.3,488.6 L559.3,496.9 L554.1,500.0 L553.1,506.2 L547.9,511.4 L546.9,516.6 L521.1,541.4 L515.9,542.5 L511.8,547.6 L506.6,548.7 L503.5,553.9 L493.2,557.0 L490.1,561.1 L480.8,561.1 L471.5,567.3 L446.7,569.4 L443.6,572.5 L438.5,572.5 L436.4,570.4 L435.4,563.2 L433.3,563.2 L427.1,555.9 L422.0,554.9 L404.4,536.3 L400.3,535.2 L398.2,530.0 L394.1,529.0 L392.0,523.8 L388.9,523.8 L387.9,520.7 L380.7,516.6 L376.5,511.4 L364.1,512.4 L362.1,516.6 L357.9,518.6 L340.4,538.3 L338.3,538.3 L336.3,547.6 L341.4,551.8 L340.4,554.9 L335.2,554.9 L329.0,549.7 L321.8,547.6 L318.7,543.5 L312.5,542.5 L310.4,538.3 L303.2,533.1 L303.2,531.1 L297.0,529.0 L293.9,523.8 L289.8,522.8 L288.8,519.7 L284.6,517.6 L268.1,499.0 L265.0,497.9 L264.0,493.8 L258.8,489.7 L256.7,483.4 L251.6,479.3 L250.6,475.2 L245.4,472.0 L243.3,463.8 L240.2,462.7 L238.2,455.5 L233.0,450.3 L233.0,445.1 L226.8,438.9 L226.8,431.7 L220.6,423.4 L220.6,413.0 L214.4,398.5 L213.4,358.1 L215.4,328.1 L219.6,320.8 L220.6,308.4 L225.8,302.2 L227.8,293.9 L232.0,290.8 L233.0,284.6 L237.1,280.5 L239.2,272.2 L244.4,269.1 L245.4,263.9 L250.6,258.7 L251.6,254.6 L256.7,251.5 L257.8,247.3 L261.9,245.2 L262.9,242.1 L282.6,224.5 L282.6,222.5 L286.7,221.4 L289.8,216.2 L295.0,215.2 L298.0,211.1 L304.2,209.0 L307.3,203.8 L314.6,202.8 L319.7,197.6 L328.0,196.6 L334.2,191.4 L345.5,190.4 L352.8,185.2 L369.3,184.1 L385.8,180.0 Z M482.9,103.4 L502.5,105.4 L511.8,109.6 L522.1,109.6 L530.4,114.8 L545.9,116.8 L549.0,121.0 L561.3,123.0 L566.5,128.2 L570.6,128.2 L573.7,133.4 L579.9,137.5 L579.9,139.6 L585.1,141.7 L587.2,145.8 L593.4,146.9 L598.5,153.1 L601.6,153.1 L603.7,157.2 L609.9,160.3 L611.9,164.5 L618.1,165.5 L627.4,173.8 L629.5,177.9 L633.6,180.0 L635.7,184.1 L638.8,184.1 L640.9,188.3 L645.0,190.4 L646.0,194.5 L652.2,198.6 L653.2,204.9 L657.4,208.0 L658.4,213.1 L664.6,218.3 L665.6,224.5 L669.8,227.6 L671.8,235.9 L676.0,239.0 L678.0,249.4 L682.2,252.5 L684.2,272.2 L686.3,275.3 L690.4,275.3 L690.4,302.2 L691.4,311.5 L694.5,313.6 L693.5,318.8 L685.3,319.8 L676.0,325.0 L654.3,327.1 L646.0,331.2 L624.3,328.1 L622.3,326.0 L611.9,324.0 L610.9,292.9 L605.7,285.6 L603.7,276.3 L599.6,274.2 L596.5,264.9 L593.4,263.9 L592.3,259.7 L587.2,256.6 L587.2,254.6 L582.0,251.5 L579.9,247.3 L585.1,246.3 L594.4,252.5 L616.1,253.5 L630.5,240.1 L635.7,238.0 L635.7,233.9 L632.6,229.7 L630.5,229.7 L627.4,221.4 L619.2,222.5 L609.9,230.7 L604.7,231.8 L600.6,238.0 L583.0,237.0 L571.7,232.8 L562.4,231.8 L558.2,225.6 L554.1,224.5 L541.7,213.1 L538.6,213.1 L534.5,206.9 L531.4,206.9 L525.2,200.7 L521.1,200.7 L515.9,194.5 L510.8,193.5 L507.7,189.3 L500.4,188.3 L494.2,182.1 L488.0,182.1 L480.8,175.9 L474.6,175.9 L467.4,170.7 L451.9,168.6 L441.6,163.4 L420.9,163.4 L412.7,160.3 L389.9,160.3 L381.7,163.4 L356.9,164.5 L348.6,169.6 L338.3,169.6 L332.1,174.8 L322.8,175.9 L317.7,181.0 L310.4,182.1 L306.3,185.2 L306.3,187.2 L300.1,188.3 L295.0,193.5 L289.8,194.5 L285.7,200.7 L281.5,200.7 L277.4,205.9 L271.2,208.0 L268.1,213.1 L257.8,220.4 L249.5,231.8 L245.4,233.9 L237.1,248.4 L230.9,252.5 L230.9,255.6 L225.8,261.8 L223.7,269.1 L219.6,272.2 L217.5,280.5 L213.4,283.6 L212.3,291.8 L206.2,298.1 L205.1,307.4 L203.1,307.4 L202.0,300.1 L206.2,295.0 L209.3,278.4 L213.4,274.2 L215.4,263.9 L219.6,259.7 L221.6,251.5 L225.8,248.4 L226.8,241.1 L230.9,237.0 L233.0,228.7 L238.2,224.5 L240.2,216.2 L249.5,214.2 L256.7,209.0 L258.8,199.7 L262.9,196.6 L265.0,187.2 L269.1,184.1 L270.2,180.0 L274.3,177.9 L284.6,165.5 L287.7,165.5 L290.8,160.3 L305.3,152.0 L308.4,146.9 L311.5,146.9 L317.7,140.6 L323.9,139.6 L325.9,135.5 L334.2,133.4 L339.4,128.2 L346.6,128.2 L351.7,123.0 L362.1,122.0 L368.3,116.8 L380.7,115.8 L394.1,109.6 L404.4,109.6 L409.6,111.6 L465.3,108.5 L475.6,109.6 L482.9,104.4 Z';

// The sleeve mark, measured on the home figure (jersey top y=184, sleeve hem y=250, figure center
// x=509.5, so scaleY = 191/66 and scaleX = 264/84.5). The band runs reference x439-447 at y197 and
// widens to x439-455 by y241; the tail is a thin wedge from x433 @ y204 down to where it meets the
// band at x439 @ y218. Both run past the hem so the jersey clip trims them flush.
export const RAMS_SLEEVE_BAND_LEFT = 'M74,420 L99,420 L124,560 L74,560 Z';
export const RAMS_SLEEVE_BAND_RIGHT = 'M514,420 L489,420 L464,560 L514,560 Z';
export const RAMS_SLEEVE_TAIL_LEFT = 'M55,436 L74,424 L74,490 Z';
export const RAMS_SLEEVE_TAIL_RIGHT = 'M533,436 L514,424 L514,490 Z';
