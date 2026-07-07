import type { TeamColors } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';

// A generated jersey silhouette in a kit's colors — the fallback thumbnail when a
// uniform has no committed image (Uniform.imagePath is unset). Body = primary,
// sleeves + collar = secondary, and a "1" in whatever reads on the body. Recognizable
// enough to tell creamsicle from kelly green from navy at a glance, with zero assets.
export default function JerseySwatch({ colors, size = 34 }: { colors: TeamColors; size?: number }) {
  const { primary, secondary } = colors;
  const numberColor = readableTextOn(primary);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {/* sleeves */}
      <path d="M15 7 L5 13 L2 23 L9 27 L15 18 Z" fill={secondary} />
      <path d="M33 7 L43 13 L46 23 L39 27 L33 18 Z" fill={secondary} />
      {/* body */}
      <path d="M15 7 L19 5 Q24 9 29 5 L33 7 L33 43 L15 43 Z" fill={primary} />
      {/* collar */}
      <path d="M19 5 Q24 11 29 5 L26.5 4 Q24 6.5 21.5 4 Z" fill={secondary} />
      <text x="24" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill={numberColor}>
        1
      </text>
    </svg>
  );
}
