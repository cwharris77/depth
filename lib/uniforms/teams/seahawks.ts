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
// concern from linework: 80% of shell width, flush to the rear edge, 32% down, no rotation. The
// mark reads as angled because of its own swept tail, not because a rotation is applied -- a
// 0/-8/-15 degree sweep against the reference picked 0. Verified side by side against the helmet
// reference, which is the acceptance check; matching the logo alone is what made the first pass
// well-drawn and misplaced.
//
// Three layers now, painted grey -> white -> eye. The grey wing was MISSING from the previous
// decal entirely: only the white channels and the eye were traced, so the mark lost the element
// the reference puts at the lower rear. The navy body is still not painted -- it merges with the
// navy shell, which is why the counters read through. That is correct for home and away and is a
// known gap on the teal rivalries shell, tracked separately.
export const SEAHAWKS_HELMET_HAWK_PATH =
  'M213.3,260.8C214.8,261.1 215.3,261.4 216.3,262.6C223.6,271.3 230.8,276.3 242.3,277.5C245.7,277.7 249.1,277.7 252.5,277.7C253.4,277.7 254.3,277.7 255.2,277.7C257.7,277.7 260.2,277.7 262.7,277.6C265.3,277.6 268.0,277.6 270.7,277.6C275.4,277.6 280.0,277.6 284.7,277.6C291.4,277.6 298.1,277.6 304.9,277.6C308.0,277.6 311.2,277.6 314.3,277.6C314.6,277.6 314.9,277.6 315.3,277.6C322.8,277.6 330.3,277.6 337.7,277.6C337.9,277.6 337.9,277.6 338.7,277.6C344.4,277.6 350.0,277.6 355.7,277.6C360.3,277.6 364.9,277.5 369.6,277.5C369.9,277.5 370.2,277.5 370.5,277.5C378.0,277.5 385.5,277.5 392.9,277.5C393.2,277.5 393.6,277.5 393.9,277.5C397.0,277.5 400.2,277.5 403.3,277.5C410.0,277.5 416.8,277.5 423.5,277.5C428.4,277.5 433.3,277.5 438.2,277.5C440.9,277.5 443.5,277.5 446.2,277.5C455.6,277.4 464.9,277.4 474.3,278.0C474.6,278.0 474.9,278.0 475.3,278.0C492.5,279.0 510.1,281.8 525.8,289.5C526.0,289.6 526.3,289.8 526.6,289.9C533.7,293.4 540.7,298.0 545.9,304.0C547.7,306.0 549.2,306.8 551.9,307.0C552.7,307.1 553.5,307.2 554.2,307.3C554.7,307.3 555.1,307.4 555.6,307.4C558.7,307.8 561.8,308.3 565.0,308.8C565.3,308.9 565.7,308.9 566.0,309.0C595.3,313.8 629.3,321.1 651.7,341.6C652.1,342.0 652.6,342.4 653.0,342.8C663.3,352.6 668.8,365.5 669.4,379.7C670.0,410.3 651.8,437.9 632.3,460.1C632.0,460.4 631.7,460.8 631.4,461.1C628.7,464.2 625.8,467.1 622.9,470.0C622.8,470.1 622.8,470.1 622.2,470.8C618.7,474.3 615.1,477.6 611.1,480.4C610.7,480.7 610.3,481.0 609.9,481.3C600.5,488.4 590.5,493.2 578.8,494.6C579.8,492.6 581.0,490.9 582.4,489.2C587.5,482.4 594.4,472.2 594.4,463.4C594.4,462.9 594.4,462.3 594.4,461.7C594.1,458.9 592.9,457.0 590.7,455.2C580.8,448.3 561.7,449.1 550.0,448.1C549.6,448.0 549.2,448.0 548.7,448.0C547.5,447.8 546.3,447.7 545.1,447.6C544.9,447.6 544.9,447.6 544.0,447.6C535.5,446.9 526.9,446.8 518.3,446.8C516.6,446.8 514.8,446.8 513.0,446.8C509.9,446.8 506.8,446.8 503.7,446.8C499.1,446.8 494.4,446.8 489.8,446.8C482.0,446.8 474.3,446.7 466.5,446.7C455.4,446.7 444.3,446.7 433.1,446.7C428.7,446.7 424.2,446.7 419.7,446.7C419.5,446.7 419.5,446.7 418.2,446.7C406.4,446.7 394.6,446.7 382.8,446.7C382.6,446.7 382.6,446.7 381.3,446.7C369.2,446.7 357.2,446.7 345.2,446.6C344.7,446.6 344.1,446.6 343.6,446.6C341.0,446.6 338.4,446.6 335.8,446.6C335.3,446.6 334.7,446.6 334.2,446.6C333.2,446.6 332.1,446.6 331.1,446.6C313.9,446.6 296.6,446.6 279.4,446.6C277.0,446.6 274.5,446.6 272.1,446.6C271.6,446.6 271.2,446.6 270.7,446.6C263.0,446.6 255.3,446.6 247.6,446.6C239.8,446.6 232.1,446.6 224.4,446.5C219.8,446.5 215.2,446.5 210.6,446.5C207.5,446.5 204.5,446.5 201.4,446.5C199.6,446.5 197.9,446.5 196.1,446.5C174.5,446.5 174.5,446.5 165.5,444.2C165.2,444.1 165.0,444.0 164.7,444.0C155.5,441.6 148.3,436.7 143.4,428.4C138.5,419.7 138.1,410.9 140.7,401.4C142.7,394.5 145.6,387.9 148.7,381.4C148.8,381.2 148.8,381.2 149.3,380.3C151.5,375.7 153.8,371.3 156.2,366.9C158.3,363.1 160.3,359.3 162.3,355.5C164.8,350.9 167.3,346.2 169.7,341.6C172.1,337.2 174.5,332.8 176.8,328.4C179.4,323.5 182.0,318.5 184.7,313.6C186.1,310.9 187.6,308.1 189.1,305.4C189.2,305.1 189.4,304.8 189.6,304.5C190.2,303.2 190.9,302.0 191.5,300.8C193.7,296.7 195.9,292.6 198.1,288.5C199.7,285.7 201.2,282.9 202.6,280.0C204.4,276.5 206.3,273.1 208.1,269.7C208.3,269.3 208.5,268.9 208.8,268.5C210.2,265.9 211.7,263.3 213.3,260.8ZM215.5,275.4C215.3,275.8 215.0,276.2 214.8,276.6C207.7,290.1 207.7,290.1 204.9,295.2C202.6,299.3 200.4,303.5 198.2,307.6C195.8,312.2 193.4,316.7 191.0,321.2C189.0,324.7 187.1,328.3 185.2,331.8C182.8,336.4 180.4,340.9 178.0,345.5C177.7,346.0 177.4,346.4 177.2,346.9C176.9,347.4 176.7,347.8 176.5,348.3C176.4,348.4 176.4,348.4 175.8,349.4C175.4,350.2 175.0,350.9 174.5,351.6C173.9,352.7 173.9,352.7 173.9,354.5C189.6,354.5 205.2,354.5 220.9,354.5C222.7,354.5 224.6,354.5 226.4,354.5C226.8,354.5 227.2,354.5 227.6,354.5C233.5,354.5 239.5,354.5 245.4,354.5C251.5,354.5 257.7,354.5 263.8,354.6C267.6,354.6 271.3,354.6 275.1,354.6C277.7,354.6 280.3,354.6 282.9,354.6C284.4,354.6 285.9,354.6 287.4,354.6C308.9,354.6 322.5,350.4 339.6,337.3C347.5,331.2 355.9,325.4 364.9,320.9C365.2,320.7 365.5,320.5 365.8,320.4C391.7,306.9 422.3,307.2 449.7,315.6C460.2,318.9 470.2,323.4 480.2,327.8C513.6,342.7 513.6,342.7 528.3,337.6C528.5,337.6 528.5,337.6 529.3,337.2C525.1,341.7 518.6,343.2 512.6,343.5C499.3,343.7 487.5,339.2 475.4,334.2C472.6,333.1 469.8,331.9 467.1,330.8C466.8,330.7 466.5,330.6 466.1,330.4C445.0,321.9 421.4,314.6 398.5,320.0C398.3,320.0 398.3,320.0 397.3,320.3C391.3,321.7 385.5,323.9 379.9,326.6C379.5,326.8 379.2,326.9 378.8,327.1C370.3,331.2 362.5,336.6 355.1,342.5C354.8,342.8 354.4,343.1 354.0,343.4C347.6,348.4 341.5,354.0 335.7,359.8C335.7,360.4 335.7,360.9 335.7,361.5C336.6,362.4 337.4,363.0 338.3,363.7C338.9,364.2 339.5,364.6 340.1,365.0C340.4,365.2 340.7,365.5 341.0,365.7C342.5,366.9 343.9,368.1 345.4,369.3C347.6,371.1 349.8,372.8 352.0,374.6C354.3,376.3 356.5,378.1 358.7,379.9C363.0,383.4 367.4,386.9 371.9,390.3C371.6,391.8 371.0,392.9 370.2,394.2C369.9,394.6 369.6,395.1 369.3,395.5C369.0,396.0 368.7,396.4 368.4,396.9C368.1,397.4 367.8,397.9 367.5,398.4C365.8,401.1 364.0,403.7 362.3,406.3C362.2,406.4 362.2,406.4 361.7,407.1C360.9,408.4 360.0,409.7 359.1,410.9C355.3,416.7 353.3,420.9 353.8,427.8C354.5,430.6 356.4,432.8 358.7,434.5C363.7,437.3 369.7,437.3 375.3,437.2C375.9,437.2 376.6,437.2 377.2,437.2C378.9,437.3 380.6,437.3 382.3,437.2C384.2,437.2 386.1,437.3 387.9,437.3C391.2,437.3 394.4,437.3 397.6,437.3C402.3,437.3 407.0,437.3 411.6,437.3C419.3,437.3 426.9,437.3 434.5,437.3C435.0,437.3 435.4,437.3 435.9,437.3C439.1,437.3 442.4,437.3 445.6,437.3C449.2,437.3 452.9,437.4 456.6,437.4C457.0,437.4 457.5,437.4 457.9,437.4C465.5,437.4 473.1,437.4 480.7,437.4C484.9,437.4 489.2,437.4 493.4,437.4C521.5,437.4 549.2,438.2 577.0,442.3C577.9,442.4 578.7,442.5 579.5,442.7C587.4,443.8 596.7,445.4 602.0,452.0C604.8,456.3 605.0,461.1 604.2,466.1C603.3,469.6 601.8,472.7 600.0,475.8C599.5,476.6 599.1,477.4 598.7,478.2C598.8,478.5 599.0,478.8 599.1,479.1C602.0,477.1 604.7,475.0 607.3,472.6C608.2,471.8 609.1,471.0 610.0,470.2C612.3,468.2 614.5,466.1 616.6,463.9C617.0,463.5 617.4,463.1 617.8,462.7C620.1,460.4 622.2,458.1 624.3,455.7C624.7,455.3 625.1,454.8 625.4,454.4C629.1,450.1 632.5,445.6 635.8,441.1C636.0,440.8 636.2,440.5 636.5,440.2C649.9,421.9 663.3,399.2 660.1,375.7C658.2,362.8 651.1,352.0 640.7,344.2C617.6,327.7 586.3,320.5 558.5,317.1C558.1,317.1 557.6,317.0 557.2,316.9C555.0,316.7 552.8,316.4 550.7,316.2C549.9,316.1 549.1,316.0 548.3,315.9C547.9,315.9 547.6,315.8 547.2,315.8C543.9,315.4 542.3,313.5 540.4,310.9C526.6,294.3 501.3,289.5 481.1,287.6C474.2,286.9 467.2,286.8 460.2,286.8C459.3,286.8 458.4,286.8 457.4,286.8C454.9,286.8 452.4,286.8 449.9,286.8C447.1,286.8 444.4,286.8 441.7,286.8C437.0,286.8 432.2,286.8 427.5,286.8C420.4,286.8 413.2,286.8 406.1,286.8C403.2,286.8 400.3,286.8 397.5,286.8C397.1,286.8 396.8,286.8 396.5,286.8C388.9,286.8 381.3,286.9 373.7,286.9C373.4,286.9 373.1,286.9 372.7,286.9C365.0,286.9 357.3,286.9 349.5,286.9C349.2,286.9 348.9,286.9 348.5,286.9C346.8,286.9 345.2,286.9 343.5,286.9C343.1,286.9 342.8,286.9 342.5,286.9C341.8,286.9 341.1,286.9 340.5,286.9C329.4,286.9 318.3,286.9 307.2,286.9C305.7,286.9 304.1,286.9 302.5,286.9C302.2,286.9 301.9,286.9 301.6,286.9C296.6,286.9 291.7,286.9 286.8,286.9C281.8,286.9 276.8,286.9 271.8,286.9C269.1,286.9 266.4,286.9 263.8,286.9C261.3,286.9 258.8,286.9 256.4,286.9C255.5,286.9 254.6,286.9 253.7,286.9C242.1,287.0 229.0,286.4 219.4,278.9C218.7,278.0 218.0,277.0 217.3,276.0C217.2,275.9 217.2,275.9 216.8,275.4C216.4,275.4 215.9,275.4 215.5,275.4ZM165.5,369.5C164.7,371.1 163.8,372.6 163.0,374.2C162.7,374.6 162.5,375.0 162.2,375.5C145.6,406.0 145.6,406.0 149.1,418.9C151.3,425.2 154.8,429.6 160.7,432.7C168.3,436.3 176.6,436.7 184.9,436.9C185.3,436.9 185.6,436.9 186.0,437.0C193.2,437.2 200.5,437.2 207.7,437.2C209.5,437.2 211.3,437.2 213.2,437.2C216.3,437.2 219.4,437.2 222.5,437.2C227.0,437.2 231.5,437.2 236.0,437.2C243.3,437.2 250.7,437.2 258.0,437.2C265.1,437.2 272.2,437.1 279.3,437.1C279.7,437.1 280.2,437.1 280.6,437.1C282.8,437.1 285.0,437.1 287.2,437.1C305.4,437.1 323.7,437.1 341.9,437.1C341.9,435.4 341.2,434.5 340.3,433.0C338.5,429.4 338.2,426.4 339.1,422.5C341.0,416.4 344.5,410.8 347.8,405.4C348.0,405.2 348.0,405.2 348.6,404.2C349.1,403.5 349.5,402.7 350.0,402.0C350.2,401.6 350.5,401.3 350.7,400.9C350.8,400.8 350.8,400.8 351.2,400.0C351.7,398.8 351.6,398.1 351.2,396.9C350.3,396.0 349.4,395.2 348.4,394.4C348.1,394.2 347.9,394.0 347.6,393.7C345.2,391.8 342.8,389.8 340.4,388.0C339.0,386.9 337.7,385.9 336.4,384.8C324.7,375.3 315.2,370.2 299.8,369.7C299.7,369.7 299.7,369.7 298.9,369.7C292.3,369.5 285.8,369.4 279.2,369.4C277.9,369.4 276.7,369.4 275.4,369.4C272.8,369.4 270.1,369.4 267.4,369.4C263.6,369.5 259.7,369.5 255.9,369.5C249.6,369.5 243.4,369.5 237.1,369.5C231.1,369.5 225.0,369.5 219.0,369.5C218.6,369.5 218.2,369.5 217.8,369.5C215.9,369.5 214.1,369.5 212.2,369.5C196.6,369.5 181.1,369.5 165.5,369.5ZM558.9,330.6C558.4,331.8 557.7,332.8 556.9,333.8C556.0,335.0 555.8,335.5 555.5,337.1C555.9,339.0 556.4,339.6 558.0,340.8C561.4,342.8 565.3,343.2 569.1,343.8C589.0,347.0 612.8,352.0 625.7,368.9C632.0,378.6 633.5,389.2 631.4,400.4C629.6,408.8 626.5,416.5 622.7,424.2C622.5,424.6 622.3,425.0 622.1,425.4C620.8,427.9 619.3,430.3 617.7,432.7C616.0,432.4 614.7,431.9 613.1,431.2C612.7,431.0 612.2,430.7 611.8,430.5C611.3,430.3 610.8,430.0 610.3,429.8C576.6,413.4 539.3,404.0 461.5,396.8C461.0,396.8 460.6,396.8 460.2,396.8C442.6,396.8 423.5,398.6 409.9,411.0C409.7,411.2 409.5,411.4 409.3,411.7C405.7,414.9 402.7,418.5 399.8,422.4C399.7,422.6 399.7,422.6 399.1,423.3C398.5,424.3 398.5,424.3 397.9,425.5C397.2,426.9 396.6,427.7 395.4,428.7C392.5,429.5 389.5,429.1 386.5,429.0C385.7,429.0 384.9,429.0 384.1,428.9C382.1,428.9 380.1,428.8 378.1,428.7C378.5,427.0 379.3,425.6 380.1,424.1C380.3,423.8 380.5,423.5 380.6,423.3C384.9,416.0 389.9,409.2 395.8,403.1C396.1,402.8 396.3,402.5 396.6,402.2C406.5,391.7 421.1,387.1 435.2,386.7C436.7,386.7 438.2,386.7 439.7,386.7C440.6,386.7 441.5,386.7 442.3,386.7C443.2,386.7 444.2,386.6 445.1,386.6C447.0,386.6 449.0,386.6 450.9,386.6C456.4,386.6 461.9,386.6 467.4,386.6C470.4,386.5 473.5,386.5 476.5,386.5C478.1,386.5 479.7,386.5 481.3,386.5C493.5,386.5 504.9,386.3 514.1,377.3C519.3,371.9 522.9,365.1 526.2,358.4C532.5,345.7 541.9,335.8 555.5,331.0C557.1,330.6 557.1,330.6 558.9,330.6ZM423.6,333.7C424.0,333.7 424.3,333.7 424.7,333.7C425.5,333.7 426.4,333.7 427.2,333.7C426.9,335.6 426.2,337.1 425.3,338.8C425.0,339.3 424.7,339.9 424.4,340.4C423.9,341.3 423.5,342.2 423.0,343.0C417.7,353.0 417.7,353.0 419.1,358.1C420.3,361.3 422.3,363.2 425.3,364.8C430.7,367.3 436.7,368.4 442.7,369.1C442.8,369.1 442.8,369.1 443.7,369.2C448.5,369.6 453.2,369.6 458.0,369.6C459.5,369.6 461.0,369.6 462.5,369.6C473.4,369.7 485.1,368.7 493.6,361.0C494.9,359.6 496.0,358.2 497.1,356.7C497.9,355.8 497.9,355.8 499.2,355.4C500.1,355.4 500.1,355.4 501.2,355.5C503.7,355.8 506.2,355.8 508.8,355.8C509.2,355.8 509.7,355.8 510.1,355.8C511.2,355.8 512.3,355.8 513.4,355.8C512.4,361.2 508.1,365.8 503.8,368.9C493.6,375.6 482.0,377.5 470.0,377.5C469.5,377.5 469.1,377.5 468.6,377.5C467.1,377.5 465.6,377.5 464.1,377.5C463.0,377.5 462.0,377.5 460.9,377.5C458.7,377.5 456.5,377.5 454.3,377.5C451.4,377.5 448.6,377.5 445.8,377.5C443.6,377.6 441.4,377.6 439.2,377.6C438.2,377.6 437.2,377.6 436.1,377.6C414.7,377.6 398.2,372.9 382.4,357.8C381.3,356.8 380.2,355.8 379.0,354.9C379.1,353.5 379.3,352.8 380.3,351.8C381.7,350.7 383.0,349.7 384.3,348.7C384.5,348.5 384.8,348.4 385.0,348.2C396.1,339.8 409.5,333.5 423.6,333.7ZM575.3,424.4C576.1,424.7 576.9,425.0 577.8,425.3C588.0,428.9 598.1,433.1 607.5,438.4C605.9,439.0 605.0,438.7 603.4,438.1C602.9,437.9 602.4,437.8 601.9,437.6C601.4,437.4 600.8,437.2 600.3,437.0C599.2,436.6 598.0,436.2 596.9,435.7C596.6,435.6 596.3,435.5 596.0,435.4C574.0,427.4 551.0,422.1 528.0,418.6C527.7,418.5 527.3,418.5 527.0,418.4C454.9,407.2 454.9,407.2 434.9,420.8C430.2,424.3 430.2,424.3 429.5,426.0C428.9,427.0 428.6,427.6 427.6,428.3C425.4,428.7 423.1,428.6 420.9,428.5C420.2,428.5 419.6,428.4 419.0,428.4C417.4,428.4 415.9,428.3 414.4,428.3C415.8,421.9 422.9,416.0 428.1,412.6C458.1,394.0 508.0,406.3 575.3,424.4Z';
// The wolf-grey wing at the lower rear of the mark, under the white keyline.
export const SEAHAWKS_HELMET_HAWK_GREY_PATH =
  'M167.7,369.4C168.2,369.4 168.7,369.4 169.2,369.4C169.4,369.4 169.4,369.4 170.8,369.4C171.3,369.4 171.9,369.4 172.4,369.4C174.0,369.4 175.5,369.4 177.0,369.4C178.7,369.4 180.4,369.4 182.0,369.4C185.3,369.4 188.5,369.4 191.8,369.4C194.4,369.4 197.1,369.4 199.7,369.4C199.9,369.4 199.9,369.4 200.8,369.4C201.6,369.4 202.4,369.4 203.1,369.4C210.3,369.4 217.5,369.4 224.7,369.4C230.8,369.4 237.0,369.4 243.1,369.4C250.3,369.4 257.4,369.4 264.6,369.4C265.3,369.4 266.1,369.4 266.9,369.4C267.0,369.4 267.0,369.4 268.0,369.4C270.6,369.4 273.3,369.4 275.9,369.4C279.1,369.4 282.3,369.4 285.6,369.4C287.2,369.4 288.8,369.4 290.5,369.4C306.6,369.4 318.8,370.7 331.7,381.0C332.2,381.4 332.8,381.8 333.3,382.2C336.3,384.6 339.3,387.0 342.3,389.4C344.6,391.3 346.9,393.1 349.2,394.9C350.2,395.7 351.2,396.5 352.0,397.3C351.9,399.3 351.0,400.7 350.0,402.3C349.9,402.6 349.7,402.8 349.6,403.1C349.2,403.7 348.9,404.2 348.6,404.8C347.7,406.2 346.8,407.7 346.0,409.1C345.8,409.4 345.6,409.7 345.5,410.0C337.8,423.1 337.8,423.1 338.8,428.7C339.4,430.9 340.3,432.8 341.5,434.7C342.3,435.8 342.3,435.8 342.3,437.1C322.1,437.1 301.9,437.2 281.7,437.2C279.3,437.2 276.9,437.2 274.5,437.2C274.0,437.2 273.6,437.2 273.1,437.2C265.4,437.2 257.7,437.2 250.0,437.2C242.1,437.2 234.2,437.2 226.3,437.2C221.5,437.2 216.6,437.2 211.7,437.2C208.4,437.2 205.0,437.2 201.7,437.2C199.8,437.2 197.8,437.2 195.9,437.2C164.0,437.3 164.0,437.3 154.4,428.3C150.1,423.8 148.1,418.0 148.1,411.9C148.2,408.3 149.0,405.1 150.0,401.8C150.2,401.2 150.4,400.7 150.5,400.1C153.3,391.4 157.9,383.2 162.1,375.2C162.3,374.7 162.6,374.2 162.8,373.7C162.9,373.5 162.9,373.5 163.5,372.4C163.7,372.1 163.9,371.7 164.1,371.3C165.1,369.5 165.8,369.4 167.7,369.4Z';
export const SEAHAWKS_HELMET_HAWK_EYE_PATH =
  'M445.7,338.1C448.3,338.4 450.6,338.9 453.0,339.8C453.3,339.9 453.6,340.0 454.0,340.1C456.2,341.0 456.2,341.0 456.8,342.1C456.8,343.0 456.8,343.0 456.4,344.4C455.7,346.8 455.6,348.8 456.9,351.0C458.8,353.4 460.9,354.7 463.9,355.4C470.0,356.0 474.3,354.9 479.3,351.2C480.8,350.8 482.0,351.6 483.3,352.3C483.3,353.7 483.1,354.6 482.2,355.7C479.1,358.7 474.8,360.0 470.5,360.2C470.3,360.2 470.3,360.2 469.3,360.3C460.9,360.4 449.8,360.3 442.7,355.4C440.8,353.4 440.3,352.1 440.3,349.5C440.8,345.3 443.4,341.5 445.7,338.1Z';

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
