import type { TeamColors } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import { variantSpec, type UniformVariant, type FigurePart } from '@/lib/uniforms/figure';

// The generated vector uniform. Colors/striping/layout are facts (not copyrightable),
// so every kit is drawn from its TeamColors — zero external image assets. One renderer
// backs both the picker (variant="jersey", the original JerseySwatch geometry) and the
// archive (variant="full"). Variants are presets in lib/uniforms/figure.ts. If a kit has
// committed art (imagePath), we show that instead of the generated figure.
// Color contract: primary = body/helmet shell, secondary = sleeves/collar/stripes,
// number = readableTextOn(primary).

function Jersey({ colors }: { colors: TeamColors }) {
  const { primary, secondary } = colors;
  const numberColor = readableTextOn(primary);
  return (
    <g>
      <path d="M15 7 L5 13 L2 23 L9 27 L15 18 Z" fill={secondary} />
      <path d="M33 7 L43 13 L46 23 L39 27 L33 18 Z" fill={secondary} />
      <path d="M15 7 L19 5 Q24 9 29 5 L33 7 L33 43 L15 43 Z" fill={primary} />
      <path d="M19 5 Q24 11 29 5 L26.5 4 Q24 6.5 21.5 4 Z" fill={secondary} />
      <text x="24" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill={numberColor}>
        1
      </text>
    </g>
  );
}

function Helmet({ colors }: { colors: TeamColors }) {
  // Shell = primary, facemask/stripe = secondary. Sits in the top 40 units.
  const { primary, secondary } = colors;
  return (
    <g>
      <path d="M12 22 Q12 8 24 8 Q38 8 38 24 L34 24 Q34 14 24 14 Q17 14 16 24 Z" fill={primary} />
      <path d="M16 24 L34 24 L33 30 Q24 33 15 30 Z" fill={secondary} />
      <rect x="23" y="8" width="2" height="16" fill={secondary} />
    </g>
  );
}

function Pants({ colors }: { colors: TeamColors }) {
  // Pants = primary with a secondary side stripe. Sits in the bottom band (y 66-96).
  const { primary, secondary } = colors;
  return (
    <g>
      <path d="M16 66 L32 66 L31 94 L26 94 L24 74 L22 94 L17 94 Z" fill={primary} />
      <rect x="23" y="66" width="2" height="28" fill={secondary} />
    </g>
  );
}

const PARTS: Record<FigurePart, (p: { colors: TeamColors }) => React.JSX.Element> = {
  helmet: Helmet,
  jersey: Jersey,
  pants: Pants,
};

// Vertical offset per part so 'full' stacks helmet(0) / jersey(24) / pants(0, drawn at
// its own y in the path). Jersey is authored at y 5-43; in 'full' we nudge it below the
// helmet. Keep the jersey UNSHIFTED for the 'jersey' variant so the picker is identical.
const PART_SHIFT: Record<UniformVariant, Partial<Record<FigurePart, number>>> = {
  jersey: {},
  full: { jersey: 26, helmet: 0, pants: 0 },
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
