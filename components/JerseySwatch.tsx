import type { TeamColors } from '@/lib/types';
import UniformFigure from './UniformFigure';

// Back-compat wrapper: the picker (components/UniformSheet.tsx) renders this. It is now
// UniformFigure's 'jersey' variant, whose geometry is byte-identical to the original
// swatch, so the selector is unchanged. New surfaces should use UniformFigure directly.
export default function JerseySwatch({ colors, size = 34 }: { colors: TeamColors; size?: number }) {
  return <UniformFigure colors={colors} variant="jersey" size={size} />;
}
