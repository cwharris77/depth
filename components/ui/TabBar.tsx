'use client';

import type { MouseEvent } from 'react';
import { colors } from './tokens';

type Option = { value: string; label: string };

// Underline-style tab group — the active tab carries a 2px bottom border in the supplied
// color (the team's uiAccent), inactive tabs are faint. Distinct from SegmentedControl's
// filled pill: used where tabs share a baseline (the Offense/Defense/Special unit switcher
// on the field). Labels render as-is; the caller upper-cases.
export default function TabBar({
  options,
  value,
  onChange,
  activeColor = colors.accent,
  className = 'flex gap-4',
}: {
  options: Option[];
  value: string;
  onChange: (value: string, event: MouseEvent) => void;
  activeColor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={(e) => onChange(opt.value, e)}
            className="pb-2.5 text-[11px] font-bold"
            style={{
              borderBottom: `2px solid ${active ? activeColor : 'transparent'}`,
              color: active ? colors.textPrimary : colors.textFaint,
              touchAction: 'manipulation',
            }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
