'use client';

import type { ReactNode } from 'react';
import { colors } from './tokens';

type FilterPillProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

// Filter chip — the uniform archive's kind/era filter bar. Active = accent fill;
// inactive = translucent chip. Always in a horizontally-scrolling row on mobile.
export default function FilterPill({ active, onClick, children }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${active ? 'font-semibold' : 'font-normal'}`}
      style={{
        background: active ? colors.accent : colors.surfaceChip,
        color: active ? colors.onAccent : '#c8cdd6',
        border: 'none',
        touchAction: 'manipulation',
      }}>
      {children}
    </button>
  );
}
