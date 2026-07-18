'use client';

import type { ReactNode } from 'react';
import { colors } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
type Size = 'md' | 'sm';

const VARIANTS: Record<Variant, { background: string; color: string; border: string }> = {
  primary: { background: colors.accent, color: colors.onAccent, border: 'none' },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    color: colors.textSecondary,
    border: `1px solid ${colors.borderInput}`,
  },
  ghost: { background: 'transparent', color: colors.textMuted, border: 'none' },
  danger: { background: colors.danger, color: colors.dangerOn, border: 'none' },
  'danger-outline': {
    background: 'transparent',
    color: colors.danger,
    border: '1px solid rgba(255,107,107,0.4)',
  },
};

const SIZE_CLASSES: Record<Size, string> = {
  md: 'px-5 py-3 text-sm rounded-xl',
  sm: 'px-3.5 py-2.5 text-xs rounded-lg',
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

// Depth's one button primitive — generalizes the primary/secondary/ghost/danger button
// patterns previously hand-rolled in AccountView.tsx. Buttons are rare in this UI (most
// actions are icon buttons or pills); this covers the real cases: primary CTA, secondary
// (cancel), ghost (text-only), danger (delete confirm), danger-outline (open danger zone).
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  fullWidth,
  children,
  onClick,
  type = 'button',
}: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-bold ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
      style={{
        background: v.background,
        color: v.color,
        border: v.border,
        touchAction: 'manipulation',
      }}>
      {children}
    </button>
  );
}
