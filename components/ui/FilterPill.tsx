'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { colors } from './tokens';

type FilterPillProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  // Overrides the active fill/text color. Pass a team's curated uiAccent/onAccent on a
  // team-specific surface (AGENTS.md invariant 4); omit for UI-chrome-only surfaces
  // (uniform archive, compare), which stay on the default green.
  accentColor?: string;
  onAccentColor?: string;
  className?: string;
};

// Filter chip — the uniform archive's kind/era filter bar. Active = accent fill;
// inactive = translucent chip. Always in a horizontally-scrolling row on mobile.
export default function FilterPill({
  active,
  onClick,
  children,
  accentColor = colors.accent,
  onAccentColor = colors.onAccent,
  className,
}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-xs',
        active ? 'font-semibold' : 'font-normal',
        className
      )}
      style={{
        background: active ? accentColor : colors.surfaceChip,
        color: active ? onAccentColor : colors.textSecondary,
        border: 'none',
        touchAction: 'manipulation',
      }}>
      {children}
    </button>
  );
}
