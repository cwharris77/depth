// Dallas' construction geometry — the star decal and the collar/sleeve constants only.
// The composable parts definition that consumes them lives in ./cowboys.parts.ts; the former flat
// COWBOYS_UNIFORMS was deleted in the migration that proved parts render byte-identically (see
// parts-parity.test.ts for the one-time gate).

// Two literals, both forced. The home palette is navy over silver with accent === secondary (ESPN
// supplies only two colors), so no token resolves to white — the neck band, the collar, the pants
// and the numerals would all come out silver. And neither palette carries the helmet color: the
// jersey silver (#869397) is several steps darker than the shell.
export const COWBOYS_WHITE = '#FFFFFF';
// "Blue Metallic", the club's published helmet color (teamcolorcodes). GUD renders its shell a
// step lighter (#B7C3CD) under its own shading; the published value is used here.
export const COWBOYS_HELMET_SILVER = '#B0B7BC';

// Traced as two nested silhouettes rather than three: the reference's mark is a navy star inside a
// white keyline inside a navy outer keyline, but that outer keyline is a single pixel and traced
// into eleven broken fragments. Painting the full silhouette white and the star body over it
// reproduces the keyline as the gap between them and drops only the outermost hairline. Traced
// from the helmet bbox (x 56-162, y 290-387 in the reference) mapped onto the raw helmet space at
// ~6.2x; the body contour winds through both the star and the keyline ring, so it needs
// fill-rule evenodd to read correctly.
export const COWBOYS_DECAL_STAR_OUTER_PATH =
  'M416.6,127.1 L425.9,127.1 L426.5,133.3 L430.8,142.6 L432.0,152.6 L437.0,161.3 L438.2,174.3 L443.2,184.3 L443.8,194.2 L449.4,206.6 L451.3,217.2 L539.8,216.6 L541.7,217.2 L541.7,227.2 L538.0,227.8 L534.3,232.7 L529.9,234.0 L526.8,239.0 L520.0,240.8 L516.9,245.2 L511.3,247.7 L508.9,251.4 L502.1,253.9 L489.7,264.4 L484.7,266.3 L474.8,275.0 L472.9,278.7 L475.4,291.2 L480.4,301.1 L482.2,312.9 L485.9,318.5 L489.0,332.8 L492.8,337.8 L492.1,345.2 L484.1,346.5 L485.9,356.4 L476.7,357.7 L472.9,352.7 L467.4,350.2 L464.9,346.5 L457.4,340.9 L450.0,337.2 L440.1,327.8 L435.8,326.0 L433.3,322.2 L428.3,320.4 L424.0,315.4 L420.3,314.8 L414.7,321.0 L395.5,333.4 L391.2,339.0 L377.5,347.1 L368.2,356.4 L363.3,358.3 L359.6,363.3 L354.0,365.1 L349.7,371.3 L344.7,371.3 L342.2,368.2 L342.2,363.3 L348.4,355.8 L349.0,344.0 L354.0,337.8 L355.2,326.0 L359.6,319.8 L361.4,307.3 L365.8,300.5 L367.0,289.9 L371.3,284.3 L372.6,279.4 L358.9,265.7 L354.0,264.4 L349.0,259.5 L344.7,258.2 L341.6,253.3 L334.8,250.8 L332.3,247.7 L327.3,245.8 L324.3,241.4 L317.4,239.0 L313.7,234.0 L309.4,232.7 L305.7,228.4 L298.2,226.5 L296.4,218.5 L297.0,217.2 L309.4,217.2 L310.0,216.0 L316.2,217.2 L334.8,217.2 L337.3,216.0 L340.4,217.2 L352.7,217.2 L354.0,216.0 L360.2,217.2 L363.3,216.0 L365.1,217.2 L383.1,216.6 L386.2,218.5 L391.2,217.8 L398.0,200.4 L399.2,188.0 L403.5,182.4 L404.2,171.2 L409.7,158.2 L411.0,146.4 L415.3,141.4 L416.6,127.7 Z';
export const COWBOYS_DECAL_STAR_BODY_PATH =
  'M418.4,127.1 L424.0,127.1 L424.0,132.1 L429.6,146.4 L431.4,158.2 L435.8,165.6 L438.2,181.8 L441.3,186.1 L443.8,200.4 L447.5,207.9 L448.8,216.6 L451.3,219.7 L523.7,219.7 L526.2,220.9 L541.7,219.7 L541.7,225.9 L538.0,225.9 L532.4,231.5 L527.5,232.7 L524.4,238.3 L518.2,240.2 L515.1,244.6 L509.5,247.0 L506.4,250.8 L500.8,252.6 L487.8,263.8 L483.5,265.1 L478.5,270.7 L474.2,272.5 L469.8,278.7 L469.8,281.8 L473.6,286.2 L474.8,295.5 L479.7,306.7 L482.2,318.5 L485.3,323.5 L487.8,335.9 L490.3,339.0 L489.7,342.7 L485.9,342.7 L480.4,335.9 L479.7,326.0 L475.4,319.8 L474.2,307.9 L469.2,300.5 L468.0,289.3 L463.6,281.8 L462.4,274.4 L464.9,271.3 L468.6,270.7 L473.6,265.7 L478.5,263.8 L482.2,258.9 L486.6,257.6 L490.3,253.3 L495.9,251.4 L499.6,247.0 L504.5,245.2 L508.2,240.2 L513.2,239.0 L518.8,234.0 L524.4,232.7 L525.6,231.5 L525.0,227.2 L522.5,225.3 L510.1,226.5 L500.8,225.3 L445.1,225.3 L441.3,212.2 L438.2,207.3 L435.8,188.0 L431.4,180.5 L428.3,162.5 L424.0,150.1 L422.1,147.6 L418.4,147.6 L416.6,155.1 L416.6,165.6 L411.6,173.7 L410.4,188.6 L405.4,199.2 L403.5,215.3 L397.4,224.7 L321.2,225.3 L319.3,226.5 L318.1,231.5 L320.5,233.4 L326.1,234.0 L330.4,238.3 L334.8,239.6 L337.9,244.6 L344.1,247.0 L348.4,251.4 L353.4,252.6 L357.1,257.6 L362.7,260.1 L365.8,263.8 L370.7,265.1 L375.1,270.7 L380.0,273.1 L379.4,285.0 L373.8,295.5 L373.2,306.1 L367.6,315.4 L367.0,325.3 L363.3,331.6 L359.6,347.7 L367.6,345.9 L372.6,340.3 L379.4,337.8 L381.9,334.0 L385.0,333.4 L389.3,327.8 L393.6,326.6 L397.4,322.2 L404.2,319.1 L414.7,309.2 L419.7,306.1 L422.8,306.1 L428.9,309.2 L433.3,314.2 L438.2,316.0 L442.0,320.4 L446.3,321.6 L450.0,326.6 L453.7,327.8 L458.1,332.8 L463.6,334.7 L466.7,338.4 L470.5,339.6 L474.2,344.6 L480.4,347.1 L483.5,353.3 L479.1,355.2 L471.7,350.8 L460.5,340.9 L438.2,325.3 L434.5,321.0 L428.9,318.5 L425.2,314.2 L420.9,312.9 L413.5,319.8 L409.7,321.0 L404.8,326.0 L393.0,333.4 L390.5,337.2 L376.3,345.9 L365.8,355.8 L360.2,358.3 L358.3,361.4 L352.7,363.3 L349.0,368.2 L345.9,368.8 L344.7,363.9 L349.0,360.1 L350.9,347.7 L355.8,337.2 L357.1,328.5 L360.8,322.2 L363.3,309.8 L367.0,303.6 L368.9,291.2 L373.8,283.7 L373.8,278.1 L360.2,264.4 L355.2,263.2 L351.5,258.9 L347.2,257.6 L344.1,253.3 L337.9,250.8 L334.2,246.4 L328.6,244.6 L325.5,240.2 L319.9,238.3 L317.4,233.4 L311.2,231.5 L307.5,227.2 L301.3,225.3 L300.1,221.6 L302.6,219.7 L314.3,220.9 L321.2,219.7 L391.8,219.7 L397.4,209.8 L399.8,195.5 L405.4,181.2 L406.0,172.5 L410.4,165.0 L412.8,148.2 L417.2,143.9 L418.4,127.7 Z';

// Home's neck band: white, silver, white across the top of the shoulders. Measured on the home
// figure (jersey top y=395, sleeve hem y=460, figure center x=101, so scaleY = 191/65 and
// scaleX = 264/84) — reference x77-126 spans y398 white, y399-400 silver, y401 white.
export const COWBOYS_NECK_BAND_OUTER = 'M219,392 H373 V404 H219 Z';
export const COWBOYS_NECK_BAND_CORE = 'M219,395 H373 V401 H219 Z';

// Home's V-collar carries the same white-over-silver pair, measured at 7 reference px across.
export const COWBOYS_COLLAR_OUTER_WIDTH = 22;
export const COWBOYS_COLLAR_CORE_WIDTH = 14;

// Away's navy sleeve cap. The seam bows: measured on the away figure it leaves the shoulder at
// reference x448 @ y928, pulls in to x443 @ y940, then runs back out to x457 @ y974 at the hem —
// mannequin x109 @ y430, x93 @ y465, x137 @ y571. Authored as a smooth three-point bow rather
// than through the measured points literally: the raw dip is partly the sleeve star eating into
// the mask, and following it exactly renders a visible kink mid-sleeve. Every edge except the seam
// runs past the jersey silhouette so the clip trims the cap flush.
export const COWBOYS_SLEEVE_CAP_LEFT = 'M0,380 L108,395 L102,465 L137,580 L0,580 Z';
export const COWBOYS_SLEEVE_CAP_RIGHT = 'M588,380 L480,395 L486,465 L451,580 L588,580 Z';
