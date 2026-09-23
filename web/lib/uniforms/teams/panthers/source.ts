// Carolina's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/panthers (black alternate is that sheet's row-2 figure 1, home its row-2
// figure 5, away its row-3 figure 1 — each row's later figures are pant combinations, and the
// blue-boxed group in row 1 is labelled "worn in preseason games only", so none of those were
// used). Sleeve paths use the outer 588-wide mannequin space; the helmet decal stays in raw helmet
// coordinates (x:139-802, y:65-674). Right paths mirror the left across x=294 (mirroredX = 588 - x).
//
// All three kits are ONE construction with the tokens swapped: the panther on the shell, a deep
// V-collar, and on each shoulder a fan of three tapering wedges that converge to a point above the
// sleeve hem. The fan is always [outer, inner, outer, body] reading inward — white/black on the
// blue kit, silver/blue on the black kit, black/blue on the white kit — which is why it is authored
// as one wedge painted over a wider one rather than as three separate stripes. No helmet stripe:
// the composite's helmet swatch shows the mark's own tail crossing the crown, not a centre stripe.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "KEEP POUNDING" collar
// script, the panther patch on each sleeve, and the shoulder numerals GUD draws above the fan.
//
// Construction geometry only — the mark, fan, collar and pant-stripe paths. The composable parts
// definition that consumes them lives in ./panthers.parts.ts; the former flat PANTHERS_UNIFORMS
// was deleted in the migration that proved parts render byte-identically (see parts-parity.test.ts
// for the one-time gate). The collar path/width were module-private consts; they are now exported
// for the parts file.

// Provenance: contour trace of the club's mark, emitted by scripts/uniform-draw/panthers_decal.py
// — a reproduction of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (en.wikipedia `File:Carolina Panthers logo.svg`, fair use; trademarked). Licence audit: the
// vault's Decisions.md, 2026-09-03. Re-run that script rather than hand-editing these strings; it
// carries the measured placement box, the topology and the reasoning behind the layer stack.
//
// Four layers, no fill rule anywhere. Measured topology: the mark is ONE connected component with
// NO enclosed white area, so every gap that reads as a whisker or a muzzle slash is BLUE showing
// through the black rather than the shell. That makes the stack four plain unions in paint order
// — blue silhouette, black body over it, those blue gaps painted back on top, then the grey fangs
// — and sidesteps the evenodd hole that punched straight through the 49ers "F". The previous pass
// authored only the first two of these off the 46px helmet composite; it lost the jaw, the fangs
// and every interior line, which is what this replaces.
export const PANTHERS_DECAL_KEYLINE_PATH =
  'M388.9,129.7 L414.1,129.7 L431.6,131.6 L452.6,136.2 L473.6,143.7 L486.0,145.1 L487.3,147.5 L486.0,154.0 L483.8,159.2 L478.7,166.2 L480.0,169.9 L480.0,173.7 L482.5,174.6 L485.5,174.6 L494.5,176.5 L502.2,179.3 L504.8,181.2 L495.0,178.3 L483.4,176.9 L480.0,176.9 L479.1,181.2 L479.6,181.6 L488.5,182.1 L497.5,184.0 L505.6,186.8 L510.8,189.6 L510.4,190.0 L506.5,188.2 L499.7,186.3 L490.7,184.9 L478.7,184.9 L477.8,186.3 L477.4,189.1 L478.7,190.0 L487.3,190.5 L497.9,192.9 L507.8,196.6 L513.8,200.3 L513.3,200.8 L507.4,198.0 L494.5,194.7 L483.8,193.3 L476.1,193.3 L475.7,193.8 L471.0,206.9 L462.4,224.2 L453.9,237.3 L445.8,246.2 L446.6,250.4 L446.2,264.4 L444.9,271.0 L441.9,278.9 L438.1,284.5 L435.1,287.3 L429.9,290.6 L434.2,309.3 L435.9,319.6 L435.9,323.4 L425.7,323.8 L425.2,323.4 L413.7,322.9 L402.6,321.0 L388.0,317.3 L358.9,306.5 L318.7,288.7 L305.0,284.1 L287.9,280.3 L284.1,278.9 L270.4,277.1 L267.0,277.5 L259.7,276.6 L234.9,276.6 L234.5,277.1 L228.0,277.1 L210.9,278.9 L187.4,283.6 L207.9,257.4 L228.5,235.0 L245.6,218.6 L264.4,202.7 L279.4,191.4 L296.5,180.2 L315.3,169.9 L308.0,158.2 L305.9,152.6 L305.5,147.0 L305.9,145.6 L307.6,143.7 L326.0,142.3 L342.7,137.2 L359.4,133.4 L374.3,131.1 L388.4,130.2 Z';
export const PANTHERS_DECAL_BODY_PATH =
  'M403.0,133.0 L424.4,136.7 L436.3,140.5 L445.3,145.6 L447.9,148.4 L450.0,153.1 L453.9,151.7 L461.2,151.7 L464.6,152.6 L468.4,154.5 L472.7,157.8 L476.6,163.4 L476.6,163.8 L468.4,162.4 L460.7,162.9 L453.5,165.7 L450.5,169.0 L450.9,170.4 L456.0,173.2 L459.4,176.9 L461.6,182.6 L461.6,186.8 L460.7,190.5 L458.2,195.7 L455.6,198.5 L456.5,198.9 L461.2,195.7 L463.7,192.9 L465.9,189.1 L466.7,186.3 L466.7,180.2 L465.9,177.4 L464.2,175.1 L465.9,176.0 L470.6,181.6 L471.4,184.4 L471.4,191.4 L470.6,195.2 L466.3,207.8 L461.2,219.0 L453.5,233.1 L445.3,245.7 L446.2,247.1 L446.6,250.4 L446.2,253.2 L446.6,253.7 L446.2,257.4 L446.6,260.7 L445.8,267.2 L444.5,270.5 L444.9,271.0 L441.9,278.9 L438.1,284.5 L435.9,285.9 L435.1,287.3 L434.2,287.3 L433.8,288.3 L432.9,288.3 L432.5,289.2 L429.9,290.6 L429.5,290.2 L424.8,291.6 L418.4,291.6 L418.0,291.1 L417.5,291.6 L427.8,306.5 L435.9,322.9 L430.4,323.8 L425.7,323.8 L420.5,322.9 L418.0,323.4 L415.4,322.4 L413.7,322.9 L411.5,322.0 L410.3,322.4 L408.5,321.5 L408.1,322.0 L405.1,321.5 L403.4,320.6 L402.6,321.0 L401.3,320.1 L400.4,320.6 L399.1,319.6 L398.3,320.1 L388.0,317.3 L387.2,316.3 L386.7,316.8 L380.7,314.9 L376.9,313.5 L376.0,312.6 L375.6,313.1 L368.3,310.3 L367.5,309.3 L367.1,309.8 L358.9,306.5 L357.2,305.1 L356.8,305.6 L349.1,302.3 L327.7,293.0 L326.0,291.6 L325.6,292.0 L323.9,290.6 L323.4,291.1 L321.3,290.2 L320.4,289.2 L320.0,289.7 L304.2,283.6 L303.7,284.1 L299.0,282.2 L298.2,282.7 L295.2,281.3 L294.3,281.7 L286.6,279.9 L292.2,263.5 L297.8,252.3 L306.7,238.7 L318.7,225.6 L318.3,225.1 L315.3,226.5 L304.6,234.0 L293.1,244.3 L280.2,259.3 L275.1,266.8 L269.1,277.5 L263.5,276.6 L263.1,277.1 L255.0,276.6 L254.6,276.1 L253.3,276.6 L241.3,276.6 L240.4,276.1 L234.5,277.1 L231.0,276.6 L227.6,277.5 L225.0,277.1 L222.0,278.0 L220.3,277.5 L218.2,278.5 L215.6,278.5 L223.8,263.5 L234.0,248.5 L243.9,236.4 L262.3,217.2 L276.4,204.5 L293.5,191.0 L312.3,177.9 L330.3,167.1 L329.8,166.2 L328.6,166.2 L320.0,167.6 L313.6,160.6 L310.2,155.4 L306.7,148.9 L307.2,147.0 L310.6,147.0 L319.6,148.9 L338.0,148.4 L349.5,145.1 L353.8,142.3 L355.1,140.5 L363.2,137.2 L376.0,134.4 L388.9,134.4 L401.3,137.2 L410.7,141.9 L415.0,145.6 L418.8,152.2 L419.7,150.8 L419.7,147.0 L418.0,143.7 L412.0,138.1 L403.0,133.4 Z M483.0,147.5 L485.1,147.5 L486.4,148.4 L485.5,151.2 L481.3,159.6 L477.8,163.4 L474.8,155.0 L470.6,149.3 L482.5,147.9 Z';
export const PANTHERS_DECAL_DETAIL_PATH =
  'M438.5,209.2 L437.2,211.6 L435.9,216.7 L435.9,223.7 L438.1,232.1 L441.1,238.2 L444.0,247.1 L445.8,257.4 L445.8,262.1 L444.9,266.3 L441.9,272.4 L436.3,277.5 L432.9,279.4 L428.2,280.8 L419.2,280.3 L412.8,277.5 L410.3,275.6 L406.4,271.4 L403.8,266.8 L400.8,256.0 L399.6,247.1 L399.6,234.5 L400.4,228.9 L402.1,223.3 L400.4,237.8 L400.8,247.1 L403.8,257.9 L407.3,264.0 L412.4,268.2 L418.0,269.6 L427.8,269.6 L432.1,268.6 L435.9,266.8 L440.2,261.6 L441.9,256.5 L441.5,246.6 L439.8,241.5 L436.3,234.5 L433.8,226.1 L434.2,216.7 L435.5,213.4 L438.1,209.7 Z M335.4,204.5 L335.8,208.8 L338.4,217.2 L342.2,225.1 L347.4,232.6 L355.1,240.6 L362.3,246.2 L370.5,250.9 L376.9,253.2 L363.2,250.4 L355.1,247.1 L347.0,242.0 L341.8,236.4 L338.0,229.3 L335.8,222.3 L335.0,216.7 L335.4,205.0 Z M430.4,166.2 L440.2,166.7 L449.6,169.5 L443.2,174.1 L439.3,178.3 L436.8,183.5 L435.9,180.2 L434.2,177.4 L429.9,172.7 L426.9,170.4 L422.2,168.1 L422.2,167.6 L426.5,166.7 L429.9,166.7 Z M367.1,167.6 L385.0,168.1 L397.9,169.9 L402.1,171.3 L399.1,173.7 L397.4,173.7 L395.3,172.7 L385.4,170.9 L372.2,169.5 L347.8,169.9 L360.6,168.1 L366.6,168.1 Z M375.6,177.4 L385.4,177.4 L385.9,177.9 L395.3,178.3 L393.6,181.2 L379.9,180.2 L379.5,179.8 L364.1,179.8 L347.4,181.6 L364.5,178.3 L375.2,177.9 Z M377.7,186.8 L391.9,186.8 L391.9,189.6 L385.9,189.6 L385.4,189.1 L369.2,189.6 L348.2,192.9 L364.1,188.6 L373.0,187.2 L377.3,187.2 Z M387.6,149.8 L394.0,149.8 L391.4,150.8 L389.7,152.6 L380.3,151.7 L385.0,150.3 L387.2,150.3 Z';
export const PANTHERS_DECAL_HIGHLIGHT_PATH =
  'M423.9,196.6 L440.6,197.1 L446.6,198.5 L450.5,200.3 L450.0,204.1 L447.9,211.1 L442.8,221.4 L441.1,223.3 L441.9,221.4 L443.2,214.4 L442.8,204.1 L441.1,203.1 L435.1,202.2 L426.1,202.7 L421.0,204.1 L416.2,214.4 L411.5,221.9 L408.1,225.6 L409.8,220.9 L411.1,213.9 L411.1,203.1 L410.3,200.3 L418.4,197.5 L423.5,197.1 Z M437.2,245.2 L438.5,250.9 L438.1,256.0 L436.8,258.8 L433.8,261.6 L427.8,263.5 L418.0,263.5 L412.4,261.6 L415.4,256.9 L419.7,246.6 L420.1,249.5 L419.7,257.9 L421.4,258.8 L428.7,258.8 L431.2,258.3 L435.1,254.1 L436.8,249.9 L437.2,245.7 Z M394.4,149.8 L402.6,151.7 L408.5,155.0 L413.7,159.2 L403.0,157.3 L388.9,156.8 L390.2,152.6 L391.4,151.2 L394.0,150.3 Z M453.9,155.9 L459.9,155.9 L465.4,158.7 L461.6,158.2 L455.6,158.7 L452.6,159.6 L449.6,161.5 L450.5,158.7 L452.2,156.8 L453.5,156.4 Z';

// The shoulder fan, measured on the home figure (jersey top y=700, sleeve hem y=766, figure center
// x=1118.5, so scaleY = 191/66 and scaleX = 264/84.5). Reading inward at reference y=725 the bands
// are x1051-1054, x1056-1059 and x1060-1062; all three taper to a shared point at (1068,753), and
// the middle band dies early at (1063,738). So the outer color is authored as one triangle and the
// middle band as a shorter triangle over it, which reproduces the outer/inner/outer read exactly.
export const PANTHERS_FAN_LEFT = 'M61,435 L111,421 L136,539 Z';
export const PANTHERS_FAN_RIGHT = 'M527,435 L477,421 L452,539 Z';
export const PANTHERS_WEDGE_LEFT = 'M74,421 L102,426 L121,493 Z';
export const PANTHERS_WEDGE_RIGHT = 'M514,421 L486,426 L467,493 Z';

// The collar V, measured on the same figure: the band's outer corner sits at reference (1085,703)
// and both arms meet at (1119,745) — far deeper than the generic chevron, whose point is at y=455.
// Roughly 9 reference px thick measured horizontally, which is ~24 units perpendicular to the arm.
export const PANTHERS_COLLAR_PATH = 'M189,392 L295,513 L399,392';
export const PANTHERS_COLLAR_WIDTH = 24;

// The pant leg stripe. GUD draws a team's stripe pattern in a leg-shaped swatch beside each
// figure rather than on the small front-view figure itself, which is why an earlier pass read
// these pants as unbroken; every one of Carolina's four pant colors carries the same three-band
// stripe. Measured across those swatches at the sheet's scale: a hairline keyline, a wide centre,
// a hairline keyline, spanning 11px of a 29px leg — so the centre is 82% of the band. The
// mannequin's own generic-pants-stripe-* layer IS that 16-unit band, so a part paints the generic
// layer as the keyline color and only the centre is authored here.
export const PANTHERS_STRIPE_CENTER_LEFT = 'M119.5,807 H132.5 V1462 H119.5 Z';
export const PANTHERS_STRIPE_CENTER_RIGHT = 'M455.5,807 H468.5 V1462 H455.5 Z';
