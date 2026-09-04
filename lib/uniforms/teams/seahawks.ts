import { HELMET_CROWN_STRIPE_PATH } from './shared';
import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Seattle's four archived kits, redrawn from the Gridiron Uniform Database references in
// nfl-uniform-refs/seahawks (2025 season composite + the 1976 throwback era sheet). Construction
// geometry — stripes, bands, piping — is redrawn from those references rather than traced; the
// helmet decal is the documented exception and is a machine trace awaiting hand-stylizing (see
// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Seattle Seahawks logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// Wolf Grey is a construction fact of the modern kit, not a runtime body color: `toTeamColors`
// sets accent = secondary, so an ESPN-sourced (home) palette carries no third token and 'accent'
// would resolve to action green. Hex from teamcolorcodes.
export const SEAHAWKS_WOLF_GREY = '#A5ACAF';

// The side-view shell carries no construction stripe — everything else on it is the decal. The
// composite's top-view inset is the only evidence of a center stripe: a slate wedge, narrow at the
// front and widening toward the back, tone-on-tone against the shell. GUD renders that inset as
// #2B394A on a #00132A shell; the live ESPN shell is a brighter #002A5C, so the sampled hex would
// read as a dark smudge rather than a lighter stripe. This value re-bases the inset's tonal step
// (+43/+38/+32) onto that brighter navy so the same relationship survives.
export const SEAHAWKS_HELMET_CENTER_COLOR = '#2B507C';
// The crown band this kit paints that color now lives in ./shared — San Francisco needs the same
// geometry, and it is a fact about the mannequin shell rather than about Seattle.

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Seattle Seahawks logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// Re-authored 2026-09-03 from a reference that clears the resolution gate, replacing a trace off
// the 46px GUD composite whose keyline survived as 7 disconnected fragments totalling 31px. The
// mark is traced at 1200px wide (thinnest white channel 20px = 1.67% of mark width; keyline
// resolves to one component and holds under a 0.75x downscale), then scaled, positioned and
// baked into raw helmet coordinates -- UniformLayer has no transform field, so placement cannot
// live anywhere but the path data.
//
// PLACEMENT is measured from the GUD *helmet* composite, not from the logo, and is a separate
// concern from linework -- getting the linework right and the placement wrong is what made the
// first two passes well-drawn and obviously wrong. Three facts drive it, and the first is the one
// that is easy to miss:
//
//   1. THE MARK IS NOT FULLY VISIBLE. A helmet decal wraps a curved shell, so in a 2D side view
//      its rear converges and disappears around the back. The mark is therefore authored WIDER
//      than the space it occupies and positioned to overhang the shell's rear edge (x=139), with
//      `clip: true` trimming it. Scaling the whole logo to fit inside the silhouette -- which is
//      the obvious thing to do -- shows the entire tail and reads wrong immediately.
//   2. THE FRONT ANCHORS TO A LANDMARK. The beak tip reaches the facemask's left edge (x=476 in
//      raw helmet space, the min x of the facemask geometry) and stops. That is a checkable
//      target rather than a judgement, and it is what sets the scale: 66% of shell width.
//   3. IT TILTS. -6 degrees, rising toward the front. Note an affine transform cannot reproduce
//      the true foreshortening of a wrapped decal (the tail should compress toward the rear, not
//      merely be cut off); -6 plus the rear clip is the closest approximation this renderer can
//      express, and it is good enough at the sizes this art is consumed at.
//
// Final: 66% of shell width, right edge at x=476, top edge 30% down, -6 degrees. Verified side by
// side against the helmet reference at matched scale, which is the acceptance check.
//
// Three layers now, painted grey -> white -> eye. The grey wing was MISSING from the previous
// decal entirely: only the white channels and the eye were traced, so the mark lost the element
// the reference puts at the lower rear. The navy body is still not painted -- it merges with the
// navy shell, which is why the counters read through. That is correct for home and away and is a
// known gap on the teal rivalries shell, tracked separately.
export const SEAHAWKS_HELMET_HAWK_PATH =
  'M90.5,265.4C91.8,265.6 92.2,265.7 93.1,266.7C99.9,273.2 106.2,276.7 115.7,276.6C118.6,276.6 121.4,276.2 124.1,275.9C124.9,275.8 125.6,275.7 126.4,275.7C128.4,275.5 130.5,275.2 132.5,275.0C134.7,274.8 136.9,274.5 139.1,274.3C142.9,273.9 146.7,273.5 150.5,273.1C156.1,272.5 161.6,271.9 167.1,271.3C169.7,271.1 172.3,270.8 174.9,270.5C175.1,270.5 175.4,270.5 175.7,270.4C181.8,269.8 187.9,269.1 194.1,268.5C194.2,268.5 194.2,268.5 194.9,268.4C199.5,267.9 204.2,267.4 208.8,266.9C212.6,266.5 216.4,266.1 220.2,265.7C220.5,265.7 220.7,265.7 221.0,265.6C227.1,265.0 233.2,264.3 239.4,263.7C239.6,263.6 239.9,263.6 240.1,263.6C242.7,263.3 245.3,263.0 247.9,262.8C253.4,262.2 258.9,261.6 264.4,261.0C268.5,260.6 272.5,260.2 276.5,259.7C278.7,259.5 280.9,259.3 283.0,259.0C290.7,258.2 298.4,257.4 306.2,257.0C306.4,257.0 306.7,257.0 307.0,257.0C321.2,256.3 335.9,257.0 349.4,262.0C349.6,262.1 349.9,262.2 350.1,262.3C356.2,264.5 362.4,267.8 367.2,272.2C368.8,273.7 370.1,274.2 372.3,274.1C373.0,274.1 373.6,274.2 374.3,274.2C374.7,274.2 375.0,274.2 375.4,274.2C378.0,274.2 380.6,274.4 383.2,274.5C383.5,274.5 383.8,274.6 384.1,274.6C408.5,276.0 437.1,279.1 457.2,294.0C457.6,294.3 458.0,294.5 458.4,294.8C467.6,302.0 473.3,312.1 475.0,323.6C478.1,348.8 465.6,373.0 451.5,392.8C451.3,393.1 451.1,393.4 450.9,393.7C448.9,396.5 446.8,399.1 444.7,401.8C444.6,401.9 444.6,401.9 444.1,402.5C441.5,405.6 438.9,408.6 435.8,411.4C435.5,411.6 435.3,411.9 435.0,412.2C427.9,418.8 420.1,423.6 410.6,425.7C411.3,424.0 412.1,422.5 413.0,421.0C416.7,415.0 421.4,406.0 420.7,398.8C420.7,398.4 420.6,397.9 420.6,397.4C420.1,395.1 418.9,393.7 417.0,392.4C408.2,387.6 392.7,389.9 383.0,390.1C382.6,390.1 382.3,390.1 381.9,390.1C380.9,390.1 379.9,390.1 378.9,390.1C378.7,390.1 378.7,390.1 378.0,390.2C370.9,390.3 363.9,391.0 356.9,391.7C355.4,391.9 353.9,392.0 352.5,392.2C349.9,392.5 347.4,392.7 344.8,393.0C341.0,393.4 337.3,393.8 333.5,394.2C327.1,394.8 320.7,395.5 314.3,396.2C305.2,397.1 296.1,398.1 287.0,399.0C283.3,399.4 279.6,399.8 276.0,400.2C275.8,400.2 275.8,400.2 274.7,400.3C265.0,401.3 255.4,402.3 245.7,403.3C245.5,403.4 245.5,403.4 244.4,403.5C234.5,404.5 224.6,405.5 214.8,406.6C214.3,406.6 213.9,406.6 213.5,406.7C211.3,406.9 209.2,407.1 207.1,407.4C206.6,407.4 206.2,407.5 205.8,407.5C204.9,407.6 204.1,407.7 203.2,407.8C189.1,409.2 174.9,410.7 160.8,412.2C158.8,412.4 156.8,412.6 154.8,412.8C154.4,412.8 154.0,412.9 153.6,412.9C147.3,413.6 141.0,414.2 134.7,414.9C128.3,415.6 122.0,416.2 115.6,416.9C111.9,417.3 108.1,417.7 104.3,418.1C101.8,418.3 99.3,418.6 96.8,418.9C95.3,419.0 93.9,419.2 92.5,419.3C74.7,421.2 74.7,421.2 67.2,420.0C66.9,420.0 66.7,420.0 66.4,419.9C58.7,418.8 52.4,415.3 47.7,409.0C42.9,402.3 41.8,395.1 43.1,387.1C44.1,381.2 45.9,375.6 48.0,370.0C48.0,369.8 48.0,369.8 48.3,369.0C49.7,365.1 51.3,361.3 52.9,357.4C54.2,354.2 55.6,350.9 56.9,347.6C58.5,343.5 60.1,339.5 61.8,335.5C63.3,331.7 64.9,327.9 66.4,324.1C68.1,319.8 69.9,315.5 71.6,311.3C72.6,308.9 73.5,306.5 74.5,304.1C74.6,303.8 74.7,303.6 74.8,303.3C75.3,302.3 75.7,301.2 76.1,300.1C77.5,296.6 79.0,293.0 80.5,289.5C81.5,287.1 82.5,284.6 83.5,282.1C84.6,279.1 85.8,276.1 87.1,273.2C87.2,272.9 87.3,272.5 87.5,272.2C88.4,269.9 89.4,267.7 90.5,265.4ZM93.6,277.2C93.4,277.5 93.3,277.9 93.1,278.3C88.5,289.9 88.5,289.9 86.6,294.4C85.1,298.0 83.6,301.6 82.2,305.2C80.6,309.1 79.1,313.0 77.4,316.9C76.1,320.0 74.9,323.1 73.6,326.1C72.1,330.1 70.5,334.0 68.8,338.0C68.7,338.4 68.5,338.8 68.3,339.2C68.2,339.6 68.0,340.0 67.9,340.4C67.8,340.5 67.8,340.5 67.5,341.4C67.2,342.0 66.9,342.7 66.5,343.3C66.2,344.2 66.2,344.2 66.3,345.7C79.2,344.4 92.0,343.0 104.9,341.7C106.4,341.5 107.9,341.4 109.4,341.2C109.7,341.2 110.0,341.1 110.3,341.1C115.2,340.6 120.1,340.1 125.0,339.6C130.0,339.1 135.0,338.5 140.1,338.0C143.1,337.7 146.2,337.4 149.3,337.0C151.5,336.8 153.6,336.6 155.7,336.4C156.9,336.3 158.2,336.1 159.4,336.0C177.1,334.2 187.9,329.5 200.8,317.3C206.7,311.6 213.1,306.2 220.1,301.7C220.3,301.5 220.6,301.3 220.8,301.2C240.9,287.9 266.0,285.5 289.2,290.0C298.1,291.8 306.7,294.6 315.3,297.4C344.0,306.8 344.0,306.8 355.6,301.3C355.8,301.2 355.8,301.2 356.4,300.9C353.4,304.9 348.1,306.7 343.3,307.5C332.4,308.8 322.3,306.1 311.9,303.1C309.5,302.4 307.2,301.7 304.8,301.0C304.5,300.9 304.3,300.9 304.0,300.8C285.9,295.6 265.9,291.6 247.6,298.0C247.4,298.1 247.4,298.1 246.7,298.4C241.8,300.1 237.3,302.4 232.9,305.1C232.6,305.3 232.4,305.4 232.1,305.6C225.5,309.7 219.5,314.8 214.0,320.3C213.7,320.5 213.4,320.8 213.1,321.1C208.3,325.8 203.7,330.8 199.5,336.1C199.5,336.6 199.6,337.1 199.6,337.5C200.4,338.1 201.2,338.6 202.0,339.1C202.5,339.4 203.0,339.7 203.5,340.0C203.8,340.2 204.1,340.3 204.3,340.5C205.7,341.3 207.0,342.2 208.3,343.1C210.2,344.3 212.2,345.6 214.2,346.8C216.2,348.1 218.1,349.3 220.1,350.6C224.0,353.2 227.9,355.6 231.9,358.0C231.8,359.3 231.3,360.2 230.8,361.4C230.6,361.8 230.4,362.1 230.2,362.5C230.0,362.9 229.8,363.3 229.6,363.8C229.3,364.2 229.1,364.6 228.9,365.0C227.7,367.4 226.5,369.7 225.3,372.0C225.2,372.1 225.2,372.1 224.9,372.7C224.3,373.8 223.7,374.9 223.1,376.1C220.5,381.1 219.2,384.7 220.2,390.4C221.1,392.6 222.8,394.2 224.8,395.4C229.1,397.3 234.1,396.7 238.7,396.2C239.2,396.2 239.7,396.1 240.2,396.1C241.6,395.9 243.0,395.8 244.5,395.6C246.0,395.5 247.5,395.3 249.0,395.2C251.7,394.9 254.3,394.6 257.0,394.3C260.8,393.9 264.7,393.5 268.5,393.2C274.8,392.5 281.0,391.9 287.3,391.2C287.6,391.2 288.0,391.1 288.4,391.1C291.1,390.8 293.7,390.5 296.4,390.3C299.4,390.0 302.4,389.6 305.4,389.3C305.7,389.3 306.1,389.3 306.5,389.2C312.7,388.6 318.9,387.9 325.2,387.3C328.6,386.9 332.1,386.6 335.6,386.2C358.7,383.8 381.4,382.0 404.6,383.0C405.3,383.0 406.0,383.1 406.7,383.1C413.2,383.3 421.1,383.9 426.0,388.8C428.7,392.1 429.2,396.0 428.9,400.2C428.5,403.1 427.5,405.8 426.3,408.5C426.0,409.2 425.8,409.9 425.5,410.6C425.6,410.8 425.8,411.1 425.9,411.3C428.1,409.4 430.1,407.5 432.1,405.3C432.7,404.5 433.4,403.8 434.1,403.1C435.8,401.2 437.4,399.3 439.0,397.3C439.3,396.9 439.6,396.6 439.9,396.2C441.5,394.2 443.1,392.1 444.6,389.9C444.8,389.5 445.1,389.1 445.4,388.7C448.0,384.9 450.4,381.0 452.8,376.9C452.9,376.7 453.1,376.4 453.2,376.2C462.6,360.0 471.7,340.2 467.1,321.2C464.3,310.8 457.6,302.5 448.4,297.0C428.0,285.5 401.8,282.3 378.6,281.9C378.3,281.9 377.9,281.9 377.5,281.9C375.7,281.8 373.9,281.8 372.1,281.8C371.5,281.8 370.8,281.8 370.2,281.8C369.9,281.8 369.6,281.8 369.3,281.8C366.5,281.7 365.1,280.3 363.2,278.4C350.5,265.9 329.3,264.2 312.6,264.3C306.8,264.4 301.1,264.9 295.4,265.5C294.6,265.6 293.8,265.6 293.1,265.7C291.0,265.9 289.0,266.2 286.9,266.4C284.6,266.6 282.4,266.9 280.2,267.1C276.3,267.5 272.4,267.9 268.6,268.3C262.7,268.9 256.8,269.6 251.0,270.2C248.6,270.4 246.2,270.7 243.9,270.9C243.6,271.0 243.4,271.0 243.1,271.0C236.9,271.7 230.6,272.3 224.4,273.0C224.2,273.0 223.9,273.0 223.6,273.1C217.3,273.8 210.9,274.4 204.6,275.1C204.3,275.1 204.0,275.2 203.7,275.2C202.3,275.3 201.0,275.5 199.6,275.6C199.3,275.7 199.1,275.7 198.8,275.7C198.2,275.8 197.7,275.8 197.1,275.9C188.0,276.8 178.9,277.8 169.9,278.8C168.6,278.9 167.3,279.0 166.0,279.2C165.7,279.2 165.5,279.2 165.2,279.3C161.2,279.7 157.1,280.1 153.1,280.5C149.0,281.0 144.9,281.4 140.8,281.8C138.6,282.1 136.4,282.3 134.2,282.5C132.2,282.8 130.1,283.0 128.1,283.2C127.4,283.3 126.7,283.3 125.9,283.4C116.4,284.5 105.6,285.1 97.1,279.8C96.4,279.1 95.8,278.4 95.2,277.6C95.1,277.5 95.1,277.5 94.7,277.1C94.3,277.1 93.9,277.2 93.6,277.2ZM60.7,358.8C60.1,360.1 59.6,361.5 59.0,362.8C58.9,363.2 58.7,363.6 58.5,364.0C47.5,390.4 47.5,390.4 51.5,400.7C53.9,405.7 57.1,409.0 62.2,411.0C68.7,413.3 75.6,412.9 82.5,412.4C82.7,412.4 83.0,412.4 83.3,412.3C89.3,411.9 95.2,411.3 101.2,410.6C102.7,410.5 104.1,410.3 105.6,410.2C108.2,409.9 110.7,409.6 113.3,409.4C117.0,409.0 120.7,408.6 124.4,408.2C130.4,407.6 136.4,406.9 142.4,406.3C148.2,405.7 154.1,405.1 159.9,404.4C160.2,404.4 160.6,404.4 161.0,404.3C162.8,404.1 164.6,404.0 166.4,403.8C181.4,402.2 196.3,400.6 211.2,399.0C211.1,397.6 210.5,396.9 209.6,395.8C207.8,393.0 207.3,390.6 207.7,387.2C208.7,382.1 211.1,377.2 213.4,372.5C213.5,372.3 213.5,372.3 213.9,371.5C214.2,370.8 214.6,370.1 214.9,369.5C215.0,369.2 215.2,368.9 215.3,368.6C215.4,368.4 215.4,368.4 215.7,367.8C216.0,366.7 215.8,366.2 215.4,365.2C214.6,364.6 213.8,364.0 212.9,363.4C212.7,363.3 212.4,363.1 212.2,362.9C210.1,361.5 207.9,360.2 205.8,358.8C204.6,358.1 203.4,357.3 202.2,356.6C191.8,349.8 183.5,346.4 170.9,347.3C170.8,347.3 170.8,347.3 170.2,347.4C164.7,347.8 159.4,348.3 154.0,348.9C152.9,349.0 151.9,349.1 150.9,349.2C148.7,349.5 146.5,349.7 144.3,349.9C141.2,350.3 138.0,350.6 134.9,350.9C129.7,351.5 124.6,352.0 119.5,352.5C114.5,353.1 109.5,353.6 104.6,354.1C104.3,354.2 103.9,354.2 103.6,354.2C102.1,354.4 100.5,354.5 99.0,354.7C86.2,356.1 73.5,357.4 60.7,358.8ZM380.1,292.9C379.8,294.0 379.3,294.8 378.7,295.7C378.1,296.8 378.0,297.2 377.9,298.5C378.4,300.1 378.9,300.5 380.3,301.3C383.2,302.7 386.5,302.7 389.7,302.9C406.2,303.8 426.2,305.8 438.2,318.6C444.3,326.0 446.4,334.6 445.6,344.0C444.8,351.0 443.0,357.6 440.5,364.2C440.4,364.5 440.3,364.9 440.2,365.2C439.3,367.4 438.3,369.5 437.2,371.6C435.8,371.5 434.6,371.2 433.3,370.8C432.9,370.6 432.5,370.5 432.1,370.3C431.7,370.2 431.3,370.0 430.9,369.9C401.8,359.3 370.3,354.8 305.9,355.6C305.5,355.7 305.2,355.7 304.8,355.7C290.4,357.3 274.9,360.4 264.8,371.8C264.7,371.9 264.5,372.1 264.3,372.3C261.7,375.3 259.5,378.5 257.5,382.0C257.4,382.1 257.4,382.1 257.0,382.8C256.6,383.6 256.6,383.6 256.2,384.7C255.7,385.9 255.4,386.6 254.4,387.5C252.1,388.4 249.6,388.4 247.2,388.5C246.5,388.6 245.9,388.6 245.2,388.7C243.5,388.8 241.9,388.9 240.3,389.0C240.4,387.6 240.9,386.4 241.5,385.0C241.6,384.8 241.7,384.6 241.8,384.3C244.7,377.9 248.3,372.0 252.6,366.5C252.7,366.2 252.9,365.9 253.1,365.7C260.3,356.2 271.9,351.2 283.5,349.6C284.7,349.5 285.9,349.3 287.2,349.2C287.9,349.1 288.6,349.0 289.3,349.0C290.1,348.9 290.8,348.8 291.6,348.7C293.2,348.5 294.7,348.4 296.3,348.2C300.8,347.7 305.4,347.2 309.9,346.7C312.4,346.4 314.9,346.2 317.4,345.9C318.7,345.8 320.0,345.6 321.3,345.5C331.3,344.4 340.6,343.3 347.4,335.1C351.2,330.2 353.6,324.3 355.7,318.5C359.8,307.6 366.6,298.7 377.3,293.6C378.7,293.1 378.7,293.1 380.1,292.9ZM269.4,307.1C269.7,307.1 270.0,307.0 270.3,307.0C270.9,306.9 271.6,306.9 272.3,306.8C272.3,308.4 271.8,309.7 271.2,311.1C271.0,311.6 270.8,312.1 270.6,312.6C270.3,313.3 270.0,314.1 269.7,314.8C266.2,323.5 266.2,323.5 267.8,327.6C269.0,330.1 270.9,331.5 273.4,332.5C278.1,334.0 283.1,334.5 288.1,334.5C288.2,334.5 288.2,334.5 289.0,334.5C292.9,334.4 296.8,334.0 300.7,333.6C301.9,333.5 303.1,333.4 304.4,333.3C313.4,332.4 322.8,330.5 329.2,323.5C330.1,322.3 330.9,321.0 331.7,319.7C332.2,318.8 332.2,318.8 333.3,318.4C334.1,318.3 334.1,318.3 334.9,318.4C337.0,318.4 339.1,318.2 341.2,317.9C341.5,317.9 341.9,317.8 342.3,317.8C343.2,317.7 344.1,317.6 344.9,317.5C344.6,322.0 341.4,326.2 338.2,329.1C330.4,335.4 321.1,338.0 311.2,339.1C310.8,339.1 310.5,339.2 310.1,339.2C308.8,339.3 307.6,339.5 306.4,339.6C305.5,339.7 304.6,339.8 303.8,339.9C302.0,340.1 300.1,340.3 298.3,340.4C296.0,340.7 293.7,340.9 291.4,341.2C289.6,341.4 287.8,341.6 286.0,341.8C285.1,341.8 284.3,341.9 283.4,342.0C265.9,343.9 251.9,341.5 237.7,330.5C236.7,329.7 235.7,329.0 234.6,328.4C234.6,327.2 234.7,326.6 235.4,325.7C236.4,324.7 237.4,323.8 238.4,322.8C238.6,322.7 238.8,322.5 239.0,322.3C247.3,314.5 257.8,308.2 269.4,307.1ZM401.6,368.5C402.4,368.7 403.1,368.8 403.8,369.0C412.5,371.1 421.1,373.6 429.3,377.2C428.0,377.8 427.2,377.7 425.9,377.3C425.5,377.2 425.0,377.1 424.6,377.0C424.2,376.9 423.7,376.7 423.3,376.6C422.3,376.4 421.3,376.1 420.4,375.9C420.1,375.8 419.9,375.8 419.6,375.7C400.9,371.1 381.6,368.7 362.3,367.8C362.1,367.7 361.8,367.7 361.5,367.7C301.4,364.7 301.4,364.7 286.2,377.6C282.6,380.9 282.6,380.9 282.1,382.3C281.8,383.2 281.5,383.7 280.8,384.4C279.0,384.9 277.2,385.0 275.3,385.1C274.8,385.2 274.3,385.2 273.7,385.3C272.5,385.4 271.2,385.4 270.0,385.5C270.6,380.2 275.9,374.7 279.9,371.5C302.8,353.7 344.9,359.4 401.6,368.5Z';
// The wolf-grey wing at the lower rear of the mark, under the white keyline.
export const SEAHAWKS_HELMET_HAWK_GREY_PATH =
  'M62.5,358.5C62.9,358.4 63.3,358.4 63.7,358.3C63.9,358.3 63.9,358.3 65.0,358.2C65.4,358.2 65.9,358.1 66.4,358.1C67.6,357.9 68.9,357.8 70.2,357.7C71.5,357.5 72.9,357.4 74.2,357.2C76.9,356.9 79.6,356.7 82.2,356.4C84.4,356.2 86.6,355.9 88.7,355.7C88.9,355.7 88.9,355.7 89.7,355.6C90.3,355.5 90.9,355.5 91.6,355.4C97.5,354.8 103.4,354.2 109.2,353.6C114.3,353.0 119.3,352.5 124.4,352.0C130.2,351.3 136.1,350.7 142.0,350.1C142.6,350.0 143.2,350.0 143.8,349.9C144.0,349.9 144.0,349.9 144.8,349.8C146.9,349.6 149.1,349.4 151.3,349.1C153.9,348.9 156.6,348.6 159.2,348.3C160.5,348.2 161.9,348.0 163.2,347.9C176.5,346.5 186.6,346.6 198.1,353.8C198.5,354.1 199.0,354.4 199.5,354.7C202.2,356.4 204.8,358.1 207.5,359.9C209.5,361.2 211.6,362.5 213.6,363.8C214.5,364.3 215.4,364.9 216.2,365.5C216.2,367.1 215.6,368.3 214.9,369.8C214.8,370.0 214.7,370.2 214.6,370.5C214.4,371.0 214.2,371.4 213.9,371.9C213.3,373.2 212.8,374.5 212.2,375.7C212.1,376.0 212.0,376.2 211.9,376.5C206.7,387.9 206.7,387.9 208.0,392.4C208.7,394.1 209.6,395.6 210.8,397.0C211.5,397.9 211.5,397.9 211.6,399.0C195.0,400.7 178.4,402.5 161.9,404.3C159.9,404.5 157.9,404.7 156.0,404.9C155.6,404.9 155.2,405.0 154.8,405.0C148.5,405.7 142.2,406.3 135.9,407.0C129.4,407.7 122.9,408.4 116.4,409.1C112.4,409.5 108.5,409.9 104.5,410.3C101.7,410.6 99.0,410.9 96.2,411.2C94.6,411.4 93.1,411.5 91.5,411.7C65.3,414.5 65.3,414.5 56.7,407.9C52.7,404.7 50.6,400.0 50.1,395.0C49.9,392.1 50.2,389.4 50.8,386.6C50.9,386.1 51.0,385.6 51.1,385.2C52.5,377.8 55.7,370.7 58.4,363.7C58.5,363.3 58.7,362.9 58.9,362.5C58.9,362.3 58.9,362.3 59.3,361.3C59.4,361.0 59.6,360.7 59.7,360.3C60.4,358.8 60.9,358.6 62.5,358.5Z';
export const SEAHAWKS_HELMET_HAWK_EYE_PATH =
  'M287.9,308.8C290.1,308.8 292.0,309.1 294.0,309.6C294.3,309.7 294.6,309.7 294.9,309.8C296.8,310.3 296.8,310.3 297.4,311.1C297.4,311.9 297.4,311.9 297.2,313.1C296.9,315.1 297.0,316.8 298.2,318.5C300.0,320.3 301.8,321.2 304.3,321.4C309.4,321.5 312.8,320.1 316.6,316.7C317.8,316.2 318.8,316.8 320.0,317.2C320.1,318.3 320.0,319.1 319.4,320.1C317.1,322.9 313.7,324.3 310.1,324.8C310.0,324.9 310.0,324.9 309.1,325.0C302.3,325.8 293.2,326.7 286.9,323.2C285.2,321.8 284.6,320.8 284.4,318.6C284.5,315.1 286.3,311.8 287.9,308.8Z';

// The shoulder sweep, shared by the home and away kits: a band tapering to a point near the
// sternum, arcing up over the shoulder and running down the outer sleeve to the hem (y≈557, just
// above the mannequin's cuff notch). Home paints it wolf grey, away navy; the geometry is
// identical in both references.
export const SEAHAWKS_SHOULDER_BAND_LEFT =
  'M222,448 C150,459 78,474 46,499 C38,514 37,536 37,557 L59,557 C62,532 72,512 121,498 C160,492 206,476 222,448 Z';
export const SEAHAWKS_SHOULDER_BAND_RIGHT =
  'M366,448 C438,459 510,474 542,499 C550,514 551,536 551,557 L529,557 C526,532 516,512 467,498 C428,492 382,476 366,448 Z';

// The action-green sleeve cap sits outboard of and above the band, separated from it by a thin
// strip of exposed body color. Both outer edges deliberately overshoot the sleeve silhouette so
// the jersey clip trims them flush instead of leaving a seam along the edge.
export const SEAHAWKS_SHOULDER_CAP_LEFT =
  'M46,423 C66,426 82,439 91,456 L91,462 C74,470 52,482 30,498 C22,472 30,440 46,423 Z';
export const SEAHAWKS_SHOULDER_CAP_RIGHT =
  'M542,423 C522,426 506,439 497,456 L497,462 C514,470 536,482 558,498 C566,472 558,440 542,423 Z';

// A short bar canted across the top of each shoulder yoke, inboard of the green cap.
export const SEAHAWKS_SHOULDER_BAR_LEFT = 'M156,411 L165,420 L109,439 L99,430 Z';
export const SEAHAWKS_SHOULDER_BAR_RIGHT = 'M432,411 L423,420 L479,439 L489,430 Z';

// The 1976 sleeve carries two full-width horizontal bands instead of a shoulder sweep.
export const SEAHAWKS_1976_SLEEVE_WHITE_LEFT = 'M30,498 H176 V522 H30 Z';
export const SEAHAWKS_1976_SLEEVE_WHITE_RIGHT = 'M412,498 H558 V522 H412 Z';
export const SEAHAWKS_1976_SLEEVE_GREEN_LEFT = 'M30,522 H176 V546 H30 Z';
export const SEAHAWKS_1976_SLEEVE_GREEN_RIGHT = 'M412,522 H558 V546 H412 Z';
// Its silver pants carry a wide white stripe with a narrower green stripe inset over it.
export const SEAHAWKS_1976_PANTS_WHITE_LEFT = 'M114,807 H138 V1462 H114 Z';
export const SEAHAWKS_1976_PANTS_WHITE_RIGHT = 'M450,807 H474 V1462 H450 Z';
export const SEAHAWKS_1976_PANTS_GREEN_LEFT = 'M120,807 H132 V1462 H120 Z';
export const SEAHAWKS_1976_PANTS_GREEN_RIGHT = 'M456,807 H468 V1462 H456 Z';
// Its silver shell carries stacked royal and green bands where the modern shell is bare.
export const SEAHAWKS_1976_HELMET_ROYAL_BAND = 'M150,250 H600 V292 H150 Z';
export const SEAHAWKS_1976_HELMET_GREEN_BAND = 'M150,292 H560 V330 H150 Z';

// Rivalries reads pine-on-ice. Its body and pine now live in the kit's curated palette (primary
// and accent in lib/uniforms/data.ts), so only the shell tone needs a literal: the deep teal is a
// fourth color with no token, and can't be one — it fails AA on the dark UI (1.57), so it could
// never be uiAccent. Sampled from the GUD 2025 composite.
export const SEAHAWKS_RIVALRIES_TEAL = '#023A4D';

const COLLAR_PATH = 'M206,388 L294,455 L386,388';
const GENERIC_SHOULDER_IDS = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
];

// Home and away share one construction and differ only in which color paints the band and bar, so
// the three mirrored pairs are built once rather than transcribed per kit.
function shoulderLayers(band: ColorRef, cap: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: ColorRef }[] = [
    {
      id: 'seahawks-shoulder-bar-left',
      surface: 'sleeve-left',
      d: SEAHAWKS_SHOULDER_BAR_LEFT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-bar-right',
      surface: 'sleeve-right',
      d: SEAHAWKS_SHOULDER_BAR_RIGHT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-band-left',
      surface: 'sleeve-left',
      d: SEAHAWKS_SHOULDER_BAND_LEFT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-band-right',
      surface: 'sleeve-right',
      d: SEAHAWKS_SHOULDER_BAND_RIGHT,
      fill: band,
    },
    {
      id: 'seahawks-shoulder-cap-left',
      surface: 'sleeve-left',
      d: SEAHAWKS_SHOULDER_CAP_LEFT,
      fill: cap,
    },
    {
      id: 'seahawks-shoulder-cap-right',
      surface: 'sleeve-right',
      d: SEAHAWKS_SHOULDER_CAP_RIGHT,
      fill: cap,
    },
  ];

  return shapes.map((shape) => ({ ...shape, clip: true, kind: 'fill' }));
}

// The modern decal, shared by the kits that wear a shell it reads against. The 1976 throwback is
// excluded: that era used an entirely different mark, so it gets its stacked bands and no decal.
function hawkLayers(keyline: ColorRef, eye: ColorRef): UniformLayer[] {
  return [
    {
      id: 'seahawks-helmet-hawk-grey',
      surface: 'helmet',
      d: SEAHAWKS_HELMET_HAWK_GREY_PATH,
      clip: true,
      kind: 'fill',
      fill: SEAHAWKS_WOLF_GREY,
    },
    {
      id: 'seahawks-helmet-hawk',
      surface: 'helmet',
      d: SEAHAWKS_HELMET_HAWK_PATH,
      clip: true,
      kind: 'fill',
      fill: keyline,
    },
    {
      id: 'seahawks-helmet-hawk-eye',
      surface: 'helmet',
      d: SEAHAWKS_HELMET_HAWK_EYE_PATH,
      clip: true,
      kind: 'fill',
      fill: eye,
    },
  ];
}

export const SEAHAWKS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'seahawks',
  kits: {
    // Home drops every generic shoulder/sleeve mark: the reference has no helmet side band, no
    // yoke fill, and no cuff bar — the grey sweep terminates at the hem instead. The generic
    // collar chevron and pants stripes are kept because secondary already resolves to action
    // green, which is what the reference shows for both.
    home: {
      removeLayerIds: GENERIC_SHOULDER_IDS,
      layers: [
        {
          id: 'seahawks-helmet-center-stripe',
          surface: 'helmet',
          d: HELMET_CROWN_STRIPE_PATH,
          clip: true,
          kind: 'fill',
          fill: SEAHAWKS_HELMET_CENTER_COLOR,
        },
        ...hawkLayers('#FFFFFF', 'secondary'),
        ...shoulderLayers(SEAHAWKS_WOLF_GREY, 'secondary'),
      ],
      // The reference number is wolf grey with an action-green outline; only the fill differs from
      // the generic model, whose outline already resolves to secondary.
      number: { fill: SEAHAWKS_WOLF_GREY },
    },
    // Away is the same construction on a white body with Seattle's navy shell. Its curated
    // `secondary` is that navy and `accent` is action green, so the band/bar/collar take secondary
    // and the sleeve cap takes accent — the inverse of home's token usage, same painted result.
    // The reference's white pants carry no stripe, so the generic pair is removed rather than
    // recolored.
    away: {
      helmetColor: 'secondary',
      removeLayerIds: [
        ...GENERIC_SHOULDER_IDS,
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
      ],
      layers: [
        {
          id: 'seahawks-helmet-center-stripe',
          surface: 'helmet',
          d: HELMET_CROWN_STRIPE_PATH,
          clip: true,
          kind: 'fill',
          fill: SEAHAWKS_HELMET_CENTER_COLOR,
        },
        ...hawkLayers('#FFFFFF', 'accent'),
        ...shoulderLayers('secondary', 'accent'),
      ],
      number: { fill: 'secondary', outline: 'accent' },
    },
    // The 1976 kit predates the shoulder sweep entirely: a silver shell and silver pants, stacked
    // royal/green bands on both the helmet and the sleeves, and plain white numbers. Its outline
    // resolves to primary so the royal-on-royal keyline disappears rather than ringing the numbers
    // in green, which is what the reference shows.
    '1976-throwback': {
      helmetColor: 'accent',
      pantsColor: 'accent',
      removeLayerIds: [
        ...GENERIC_SHOULDER_IDS,
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
      ],
      layers: [
        {
          id: 'seahawks-1976-helmet-royal',
          surface: 'helmet',
          d: SEAHAWKS_1976_HELMET_ROYAL_BAND,
          clip: true,
          kind: 'fill',
          fill: 'primary',
        },
        {
          id: 'seahawks-1976-helmet-green',
          surface: 'helmet',
          d: SEAHAWKS_1976_HELMET_GREEN_BAND,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-sleeve-white-left',
          surface: 'sleeve-left',
          d: SEAHAWKS_1976_SLEEVE_WHITE_LEFT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-sleeve-white-right',
          surface: 'sleeve-right',
          d: SEAHAWKS_1976_SLEEVE_WHITE_RIGHT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-sleeve-green-left',
          surface: 'sleeve-left',
          d: SEAHAWKS_1976_SLEEVE_GREEN_LEFT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-sleeve-green-right',
          surface: 'sleeve-right',
          d: SEAHAWKS_1976_SLEEVE_GREEN_RIGHT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-pants-white-left',
          surface: 'leg-left',
          d: SEAHAWKS_1976_PANTS_WHITE_LEFT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-pants-white-right',
          surface: 'leg-right',
          d: SEAHAWKS_1976_PANTS_WHITE_RIGHT,
          clip: true,
          kind: 'fill',
          fill: '#FFFFFF',
        },
        {
          id: 'seahawks-1976-pants-green-left',
          surface: 'leg-left',
          d: SEAHAWKS_1976_PANTS_GREEN_LEFT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-pants-green-right',
          surface: 'leg-right',
          d: SEAHAWKS_1976_PANTS_GREEN_RIGHT,
          clip: true,
          kind: 'fill',
          fill: 'secondary',
        },
        {
          id: 'seahawks-1976-collar-white',
          surface: 'collar',
          d: COLLAR_PATH,
          clip: true,
          kind: 'stroke',
          stroke: '#FFFFFF',
          strokeWidth: 18,
        },
        {
          id: 'generic-collar',
          surface: 'collar',
          d: COLLAR_PATH,
          clip: true,
          kind: 'stroke',
          stroke: 'secondary',
          strokeWidth: 8,
        },
      ],
      number: { outline: 'primary' },
    },
    // Rivalries is a print, not a construction: its feathered shoulder texture has no stripe
    // geometry to draw, so — as with the Bills' ice kit — it is represented by the absence of
    // shoulder marks rather than by inventing bands. What remains is the deep teal shell, the navy
    // collar and cuffs the generic model already supplies from secondary, and the pine number.
    'rivalries-2025': {
      helmetColor: SEAHAWKS_RIVALRIES_TEAL,
      removeLayerIds: [
        'generic-helmet-stripe',
        'generic-sleeve-yoke-left',
        'generic-sleeve-yoke-right',
      ],
      layers: hawkLayers('#FFFFFF', 'accent'),
      number: { fill: 'accent', outline: 'secondary' },
    },
  },
};
