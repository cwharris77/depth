// Washington's construction geometry in mannequin space: the helmet "W" decal path and the sleeve
// band bounds.

// The "W": one layer and four subpaths, four flat strokes separated by shell-coloured gaps, with no
// keyline and no interior detail.
export const COMMANDERS_DECAL_PATH =
  'M531.6,143.2 L589.7,143.2 L591.2,148.7 L586.1,157.0 L549.0,271.2 L544.7,274.0 L500.3,274.0 L498.1,269.8 L501.0,260.8 L535.2,166.0 L535.2,152.2 L530.8,143.9 Z M336.7,143.2 L393.4,144.6 L405.1,178.5 L405.8,192.3 L382.5,256.0 L378.9,254.6 L378.2,244.9 L353.5,173.0 L336.0,143.9 Z M443.6,143.2 L490.9,143.2 L509.8,192.3 L509.8,199.9 L485.0,268.5 L446.5,152.9 L442.1,148.0 L442.9,143.9 Z M431.2,155.0 L434.9,157.7 L457.4,229.0 L440.0,273.3 L392.0,274.0 L390.5,270.5 L394.9,266.4 L430.5,155.7 Z';

// The sleeve band: a broad band split by a thinner line through its middle. A column crosses the
// outer band over y467-496, the line over y496-510 and the outer band again over y510-539, extended
// outward to x=30 (and 558) for a flush clip.
export const COMMANDERS_BOUNDS = [467, 496, 510, 539];
export const COMMANDERS_SLEEVE_X_LEFT = [30, 89];
export const COMMANDERS_SLEEVE_X_RIGHT = [499, 558];
