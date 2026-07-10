import { useId } from 'react';
import type { TeamColors } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import { variantSpec, type UniformVariant } from '@/lib/uniforms/figure';

// The generated vector uniform. Colors/striping/layout are facts (not copyrightable), so every
// kit is drawn from its TeamColors — zero external image assets, no team logos. One renderer
// backs the picker (variant="jersey") and the archive (variant="full"); a variant is a viewBox
// crop over one shared full-body mannequin. A committed image (imagePath) overrides the figure.
//
// Geometry + the region/trim model are ported from the "uniform vectorization with color
// regions" handoff (Claude Design), itself modeled on the CC BY 3.0 Wikimedia uniform template
// by JohnnySeoul (see ATTRIBUTIONS.md). For now every kit uses ONE default trim config, colored
// from its palette; per-kit trim variants (yoke/collar/stripe/number styles — the config shape
// the handoff's teams.js demonstrates) are the future "differentiate per team" step.
//
// Color contract: primary = helmet shell / jersey body / pants; secondary = helmet + sleeve +
// pant stripes and the number outline; accent = shoulder yoke + helmet stripe; number fill =
// readableTextOn(primary) so it stays legible on any body color.

const OUTLINE = '#8a9096';
const FACEMASK = '#4b5158';

// Shared mannequin paths (template coordinate space; viewBox origin 20,45).
const GEO = {
  helmet:
    'M402,65 455,65 457,67 509,73 547,85 593,109 631,137 646,152 674,188 690,218 700,260 709,261 712,264 731,293 753,297 756,300 770,328 770,349 763,356 644,387 645,443 715,449 735,455 753,457 791,469 802,480 798,535 784,577 784,583 748,653 727,674 702,674 676,666 668,666 582,644 574,644 558,638 506,638 486,634 472,630 430,610 427,610 413,622 392,622 348,580 314,554 312,559 305,564 260,562 214,550 176,532 171,527 165,511 165,499 161,483 161,445 155,425 151,389 145,363 145,332 147,330 149,299 143,277 139,271 139,262 143,252 163,214 201,162 236,127 252,115 302,91 312,89 334,79 374,69 401,66Z',
  facemask:
    'M729,302 746,306 749,309 761,333 761,346 734,355 690,365 682,369 636,379 635,449 642,452 656,452 658,454 678,454 680,456 714,458 734,464 752,466 778,474 786,478 793,485 789,534 775,576 775,582 765,604 761,608 739,650 724,665 703,665 677,657 669,657 651,651 643,651 641,649 617,645 583,635 567,633 545,625 518,610 514,602 514,591 517,585 527,595 527,601 530,604 558,618 576,622 590,628 621,634 624,631 624,622 622,620 622,606 620,604 620,584 614,580 616,571 620,569 620,546 547,545 539,541 564,499 562,486 558,480 546,444 537,433 523,423 501,409 491,405 482,396 476,386 481,367 491,379 491,385 496,390 534,414 551,431 571,469 575,487 580,496 621,496 622,490 609,487 603,476 621,478 622,460 591,457 586,447 622,447 622,350 609,345 591,343 589,341 563,337 553,333 539,333 537,331 517,333 505,328 519,318 544,318 546,320 568,322 570,324 590,326 602,330 651,336 661,332 695,326 719,318 730,311 728,303Z M740,318 743,320 749,331 740,335 738,329 734,325 734,322 739,319Z M724,328 727,328 731,334 729,339 717,343 711,343 697,349 691,349 689,351 683,351 681,353 675,353 673,355 667,355 665,357 659,357 641,363 636,363 636,350 674,346 676,344 682,344 696,338 702,338 714,334 723,329Z M538,359 545,359 556,366 560,374 558,389 551,396 545,398 532,396 525,389 523,374 527,366 537,360Z M636,462 663,464 665,466 683,466 685,468 697,468 699,470 709,470 711,472 721,472 723,474 733,474 735,476 751,478 751,489 741,489 739,491 710,491 698,487 644,483 642,481 636,481 636,463Z M712,506 731,506 737,510 749,512 749,525 747,527 699,527 697,529 649,529 647,531 634,531 634,510 668,510 670,508 711,507Z M604,510 621,510 621,533 556,533 570,512 603,511Z M758,536 763,536 763,539 761,541 761,549 759,551 759,559 757,561 753,587 749,593 749,597 745,603 745,607 731,639 729,641 726,639 724,628 738,602 744,584 744,578 750,566 750,560 752,558 752,552 757,537Z M742,538 747,539 743,547 737,577 733,583 725,607 715,625 708,623 698,615 688,611 674,601 664,597 660,593 634,579 632,577 632,544 668,544 670,542 710,542 712,540 741,539Z M560,569 569,569 578,576 580,580 580,589 578,593 569,600 560,600 551,593 549,589 549,580 551,576 559,570Z M632,592 635,592 663,610 673,614 703,634 717,648 715,653 696,653 694,651 688,651 686,649 680,649 678,647 672,647 670,645 664,645 646,639 638,639 636,637 632,593Z',
  jersey:
    'M201,383 388,383 408,395 466,403 510,417 533,430 554,453 558,465 558,559 554,563 554,582 544,589 454,589 446,603 446,644 450,683 440,696 440,773 432,793 413,806 175,806 155,792 148,773 148,697 138,683 141,601 136,591 44,589 34,582 34,563 30,559 30,464 40,445 59,427 78,417 122,403 181,395 200,384Z',
  pants:
    'M176,807 412,807 417,811 423,825 432,836 443,909 458,921 461,940 474,1044 474,1059 460,1077 460,1097 470,1133 470,1196 359,1196 294,1025 229,1196 118,1196 118,1133 128,1097 128,1077 117,1066 113,1050 129,923 145,909 155,839 170,812 175,808Z',
  shinL:
    'M118,1197 228,1197 215,1228 226,1262 226,1309 222,1330 196,1404 191,1459 118,1459 118,1391 109,1331 109,1269 125,1225 118,1198Z',
  shinR:
    'M360,1197 470,1197 462,1222 473,1248 479,1273 478,1339 470,1386 470,1459 397,1459 392,1405 366,1330 362,1309 362,1262 373,1228 360,1198Z',
  shoeL:
    'M118,1460 192,1460 198,1476 198,1510 193,1521 193,1527 201,1542 201,1563 198,1567 99,1568 89,1563 89,1533 108,1502 117,1461Z',
  shoeR:
    'M396,1460 470,1460 482,1508 498,1533 498,1563 488,1568 391,1568 387,1563 387,1542 395,1527 395,1521 390,1511 390,1476 396,1461Z',
};

export default function UniformFigure({
  colors,
  variant = 'jersey',
  size = 34,
  imagePath,
  title,
}: {
  colors: TeamColors;
  variant?: UniformVariant;
  size?: number;
  imagePath?: string;
  title?: string;
}) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const spec = variantSpec(variant);
  const [, , vbW, vbH] = spec.viewBox.split(' ').map(Number);
  const height = (size * vbH) / vbW;

  if (imagePath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imagePath} alt={title ?? ''} width={size} height={height} />;
  }

  // Default trim config, colored from the kit's palette.
  const { primary, secondary, accent } = colors;
  const numberFill = readableTextOn(primary);
  const numFont = { fontFamily: 'var(--font-anton), Anton, Helvetica, sans-serif' };
  const numAttrs = {
    x: 294,
    y: 730,
    fontSize: 210,
    textAnchor: 'middle' as const,
    letterSpacing: -4,
    style: numFont,
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={spec.viewBox}
      width={size}
      height={height}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={`${uid}-jersey`}>
          <path d={GEO.jersey} />
        </clipPath>
        <clipPath id={`${uid}-helmet`}>
          <path d={GEO.helmet} />
        </clipPath>
        <clipPath id={`${uid}-legL`}>
          <path d={GEO.pants} />
          <path d={GEO.shinL} />
        </clipPath>
        <clipPath id={`${uid}-legR`}>
          <path d={GEO.pants} />
          <path d={GEO.shinR} />
        </clipPath>
      </defs>
      <g stroke={OUTLINE} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
        <path fill={primary} d={GEO.pants} />
        <path fill={primary} d={GEO.shinL} />
        <path fill={primary} d={GEO.shinR} />
        <g stroke="none">
          <rect
            clipPath={`url(#${uid}-legL)`}
            x={118}
            y={807}
            width={16}
            height={655}
            fill={secondary}
          />
          <rect
            clipPath={`url(#${uid}-legR)`}
            x={454}
            y={807}
            width={16}
            height={655}
            fill={secondary}
          />
        </g>
        <path fill="#ffffff" d={GEO.shoeL} />
        <path fill="#ffffff" d={GEO.shoeR} />
        <path fill={primary} d={GEO.jersey} />
        <g stroke="none">
          <path
            clipPath={`url(#${uid}-jersey)`}
            fill={accent}
            d="M30,466 L78,417 L136,401 L168,470 L156,556 L34,556 Z"
          />
          <path
            clipPath={`url(#${uid}-jersey)`}
            fill={accent}
            d="M558,466 L510,417 L452,401 L420,470 L432,556 L554,556 Z"
          />
          <path
            clipPath={`url(#${uid}-jersey)`}
            fill={secondary}
            d="M34,558 L156,558 L152,578 L34,578 Z"
          />
          <path
            clipPath={`url(#${uid}-jersey)`}
            fill={secondary}
            d="M554,558 L432,558 L436,578 L554,578 Z"
          />
        </g>
        <path
          clipPath={`url(#${uid}-jersey)`}
          fill="none"
          stroke={secondary}
          strokeWidth={13}
          d="M206,388 L294,455 L386,388"
        />
        <g stroke="none">
          <text
            {...numAttrs}
            fill="none"
            stroke={secondary}
            strokeWidth={26}
            strokeLinejoin="round">
            1
          </text>
          <text {...numAttrs} fill={numberFill}>
            1
          </text>
        </g>
        <g transform="translate(80.25 11) scale(0.5)">
          <path fill={primary} stroke={OUTLINE} strokeWidth={8} d={GEO.helmet} />
          <rect
            clipPath={`url(#${uid}-helmet)`}
            x={150}
            y={286}
            width={430}
            height={44}
            fill={accent}
            stroke="none"
          />
          <path
            fill={FACEMASK}
            fillRule="evenodd"
            stroke={OUTLINE}
            strokeWidth={7}
            d={GEO.facemask}
          />
        </g>
      </g>
    </svg>
  );
}
