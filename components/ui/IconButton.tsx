'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { colors } from './tokens';
import { withAlpha } from '@/lib/colors';
import type { Intent } from './variants';

// IconButton expresses the emphasis subset of the shared vocabulary (variants.ts):
// 'primary' is the header style (translucent fill + accent-tinted border); 'ghost' is the
// quiet borderless style used inside dark sheets (player card close/share).
type Variant = Extract<Intent, 'primary' | 'ghost'>;
type Size = 'sm' | 'md';

const DIMENSIONS: Record<Size, number> = { sm: 32, md: 36 };

type IconButtonProps = {
  icon: ReactNode;
  variant?: Variant;
  accent?: string;
  active?: boolean;
  size?: Size;
  onClick?: () => void;
  ariaLabel: string;
  className?: string;
};

// Circular icon button — the dominant control shape in Depth's header/toolbars (unit
// switcher trigger, search, stats, uniform picker, share, close). 'primary' is the header
// style (translucent fill + accent-tinted border); 'ghost' is used inside dark sheets
// (player card close/share) with no border. `active` swaps the fill to an accent tint,
// e.g. the share button's "copied" state. Pass a lucide-react icon element as `icon`.
export default function IconButton({
  icon,
  variant = 'primary',
  accent = colors.accent,
  active,
  size = 'md',
  onClick,
  ariaLabel,
  className,
}: IconButtonProps) {
  const dim = DIMENSIONS[size];
  const style =
    variant === 'primary'
      ? {
          background: active ? withAlpha(accent, 15) : colors.surfaceChip,
          border: `1px solid ${withAlpha(accent, 25)}`,
        }
      : { background: active ? withAlpha(accent, 15) : colors.borderDefault, border: 'none' };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full',
        className
      )}
      style={{ ...style, width: dim, height: dim, touchAction: 'manipulation' }}>
      {icon}
    </button>
  );
}
