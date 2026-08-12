'use client';

import type { ReactNode } from 'react';
import { colors } from './tokens';

type Variant = 'chrome' | 'plain';
type Size = 'sm' | 'md';

type IconButtonProps = {
  icon: ReactNode;
  variant?: Variant;
  accent?: string;
  active?: boolean;
  size?: Size;
  onClick?: () => void;
  ariaLabel: string;
};

export default function IconButton({
  icon,
  variant = 'chrome',
  accent = colors.accent,
  active,
  size = 'md',
  onClick,
  ariaLabel,
}: IconButtonProps) {
  const style =
    variant === 'chrome'
      ? { background: active ? `${accent}26` : colors.surfaceChip, border: `1px solid ${accent}40` }
      : { background: active ? `${accent}26` : colors.borderDefault, border: 'none' };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full ${size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'}`}
      style={{ ...style, touchAction: 'manipulation' }}>
      {icon}
    </button>
  );
}
