import type { TeamColors } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import { variantSpec, type UniformVariant, type FigurePart } from '@/lib/uniforms/figure';

// The generated vector uniform. Colors/striping/layout are facts (not copyrightable), so
// every kit is drawn from its TeamColors — zero external image assets, no team logos. One
// renderer backs both the picker (variant="jersey") and the archive (variant="full").
// Variants are presets in lib/uniforms/figure.ts. A committed image (imagePath) overrides
// the generated figure.
//
// Proportions are modeled on the "NFL-Uniform-template-V3" blank template by Wikipedia
// user JohnnySeoul, used under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/) —
// modified: redrawn as color-driven SVG, logos/patches/back-views removed. See ATTRIBUTIONS.md.
//
// Color contract: primary = helmet shell / jersey body / pants; secondary = helmet stripe,
// shoulder sleeves, pant stripe; accent = collar + sleeve-cuff trim; number fill =
// readableTextOn(primary) with a secondary outline (paint-order: stroke). A light hairline
// keeps dark-primary kits legible on the dark app background.

const OUTLINE = 'rgba(255,255,255,0.28)';
const SHADE = '#000000';
const FACEMASK = '#9aa0a6';

function Helmet({ colors }: { colors: TeamColors }) {
  const { primary, secondary } = colors;
  return (
    <g strokeLinejoin="round">
      <path
        d="M28 58 C18 52 13 40 13 28 C13 12 27 4 45 4 C63 4 76 12 80 27 L78 36 C77 41 73 43 70 44 L67 57 C64 64 56 67 46 67 C39 67 33 63 28 58 Z"
        fill={primary}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path d="M28 58 C20 52 15 41 14 30 L22 33 L26 57 Z" fill={SHADE} opacity="0.14" />
      <path
        d="M22 25 C33 8 62 7 78 27"
        fill="none"
        stroke={secondary}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="30" cy="33" r="6" fill={SHADE} opacity="0.28" />
      <g fill="none" stroke={FACEMASK} strokeWidth="3" strokeLinecap="round">
        <path d="M80 27 Q95 33 91 53 Q89 59 80 59" />
        <path d="M80 31 Q91 33 92 40" />
        <path d="M79 40 Q89 42 91 47" />
        <path d="M78 49 Q87 52 87 57" />
      </g>
    </g>
  );
}

function Jersey({ colors }: { colors: TeamColors }) {
  const { primary, secondary, accent } = colors;
  const numberColor = readableTextOn(primary);
  return (
    <g strokeLinejoin="round">
      <path
        d="M33 14 C29 12 22 11 16 13 C8 16 3 24 2 34 L9 54 L25 51 C23 78 21 102 20 118 L80 118 C79 102 77 78 75 51 L91 54 L98 34 C97 24 92 16 84 13 C78 11 71 12 67 14 L50 22 L33 14 Z"
        fill={primary}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path d="M2 34 C3 24 8 16 16 13 C21 11 27 12 30 14 L30 50 L9 54 Z" fill={secondary} />
      <path d="M98 34 C97 24 92 16 84 13 C79 11 73 12 70 14 L70 50 L91 54 Z" fill={secondary} />
      <path d="M6 45 L30 41 L30 47 L8 51 Z" fill={accent} />
      <path d="M94 45 L70 41 L70 47 L92 51 Z" fill={accent} />
      <path d="M20 16 L26 13 L26 118 L20 118 Z" fill={SHADE} opacity="0.1" />
      <path d="M33 14 L50 22 L67 14 L63 9 L50 16 L37 9 Z" fill={accent} />
      <text
        x="50"
        y="86"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill={numberColor}
        stroke={secondary}
        strokeWidth="3"
        paintOrder="stroke"
        strokeLinejoin="round">
        1
      </text>
    </g>
  );
}

function Pants({ colors }: { colors: TeamColors }) {
  const { primary, secondary } = colors;
  return (
    <g strokeLinejoin="round">
      <path d="M22 2 L78 2 L78 14 L22 14 Z" fill={primary} stroke={OUTLINE} strokeWidth="1" />
      <path
        d="M24 12 L48 12 L47 70 C47 92 44 116 37 116 C31 116 28 92 28 70 Z"
        fill={primary}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path
        d="M52 12 L76 12 L72 70 C72 92 69 116 63 116 C56 116 53 92 53 70 Z"
        fill={primary}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path d="M25 8 L31 8 L29 110 L24 110 Z" fill={secondary} />
      <path d="M75 8 L69 8 L71 110 L76 110 Z" fill={secondary} />
      <ellipse cx="37" cy="74" rx="8" ry="5" fill={SHADE} opacity="0.1" />
      <ellipse cx="63" cy="74" rx="8" ry="5" fill={SHADE} opacity="0.1" />
    </g>
  );
}

const PARTS: Record<FigurePart, (p: { colors: TeamColors }) => React.JSX.Element> = {
  helmet: Helmet,
  jersey: Jersey,
  pants: Pants,
};

// Stacks the parts for the 'full' column: helmet (0-74), jersey below it, pants below that.
// The 'jersey' and 'helmet' variants render a single part unshifted at its own y=0.
const PART_SHIFT: Record<UniformVariant, Partial<Record<FigurePart, number>>> = {
  jersey: {},
  full: { helmet: 0, jersey: 80, pants: 210 },
  helmet: {},
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
  const spec = variantSpec(variant);
  const [, , vbW, vbH] = spec.viewBox.split(' ').map(Number);
  if (imagePath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imagePath} alt={title ?? ''} width={size} height={(size * vbH) / vbW} />;
  }
  const shifts = PART_SHIFT[variant] ?? {};
  return (
    <svg
      width={size}
      height={(size * vbH) / vbW}
      viewBox={spec.viewBox}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}>
      {spec.parts.map((part) => {
        const Part = PARTS[part];
        const dy = shifts[part] ?? 0;
        return (
          <g key={part} transform={dy ? `translate(0 ${dy})` : undefined}>
            <Part colors={colors} />
          </g>
        );
      })}
    </svg>
  );
}
