'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { colors } from './tokens';

// An option renders as a plain <button> unless it carries an `href`, in which case
// it renders as a Next <Link> — so a link-shaped switcher (e.g. the ROSTER/SCHEDULE/
// STATS page tabs) keeps cmd/middle-click-to-new-tab, prefetch, and real hrefs while
// still living inside this one component. onChange fires on click either way; a caller
// that owns a route transition uses the event to preventDefault before pushing.
type Option = { value: string; label: string; href?: string };

// 'md' is the standard pill (AFC/NFC, unit switcher). 'sm' is the compact variant for
// dense inline rows where a full-size pill would overflow — e.g. the page switcher
// sitting beside the team pill in the mobile header.
type Size = 'sm' | 'md';

type SegmentedControlProps = {
  options: Option[];
  value: string;
  onChange: (value: string, event: MouseEvent) => void;
  activeColor?: string;
  activeTextColor?: string;
  flat?: boolean;
  size?: Size;
  // Stretch the track and split its width equally across segments, instead of hugging
  // the labels (the default). Use when the control owns a full row.
  fullWidth?: boolean;
  // Dim and block interaction while a caller-owned action (e.g. a route transition) is
  // pending. Segments stay mounted so layout doesn't jump.
  disabled?: boolean;
  // Escape hatch for container-level layout tweaks; merged onto the track.
  className?: string;
};

const SIZES: Record<Size, { track: string; item: string }> = {
  md: { track: 'gap-1 rounded-2xl p-1', item: 'rounded-xl px-2.5 py-1.5 text-[11px]' },
  sm: { track: 'gap-0.5 rounded-lg p-0.5', item: 'rounded-md px-2 py-1 text-[9px] tracking-wide' },
};

// Rounded-pill tab group. Two flavors: 'fill' (default — active segment fills with a
// supplied color, e.g. the Offense/Defense/Special unit switcher using the team's brand
// primary) and 'flat' (active segment is a neutral translucent fill, e.g. the AFC/NFC
// conference toggle). Always wrapped in the same track chrome.
export default function SegmentedControl({
  options,
  value,
  onChange,
  activeColor = colors.accent,
  activeTextColor = colors.onAccent,
  flat = false,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
}: SegmentedControlProps) {
  const sz = SIZES[size];
  return (
    <div
      className={`flex ${sz.track} ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}
      style={{ background: colors.surfaceChip }}>
      {options.map((opt) => {
        const active = opt.value === value;
        const itemClass = `${sz.item} font-bold ${fullWidth ? 'flex-1 text-center' : ''}`;
        const itemStyle = {
          background: active ? (flat ? 'rgba(255,255,255,0.12)' : activeColor) : 'transparent',
          color: active ? (flat ? colors.textPrimary : activeTextColor) : colors.textMuted,
          border: active && !flat ? `1px solid ${activeTextColor}66` : '1px solid transparent',
          opacity: disabled && !active ? 0.5 : 1,
          pointerEvents: disabled ? ('none' as const) : undefined,
          touchAction: 'manipulation' as const,
        };
        if (opt.href) {
          return (
            <Link
              key={opt.value}
              href={opt.href}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => onChange(opt.value, e)}
              className={itemClass}
              style={itemStyle}>
              {opt.label}
            </Link>
          );
        }
        return (
          <button
            key={opt.value}
            type="button"
            onClick={(e) => onChange(opt.value, e)}
            className={itemClass}
            style={itemStyle}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
