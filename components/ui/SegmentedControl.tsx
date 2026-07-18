'use client';

import { colors } from './tokens';

type Option = { value: string; label: string };

type SegmentedControlProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  activeColor?: string;
  activeTextColor?: string;
  flat?: boolean;
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
}: SegmentedControlProps) {
  return (
    <div className="flex w-fit gap-1 rounded-2xl p-1" style={{ background: colors.surfaceChip }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold"
            style={{
              background: active ? (flat ? 'rgba(255,255,255,0.12)' : activeColor) : 'transparent',
              color: active ? (flat ? colors.textPrimary : activeTextColor) : colors.textMuted,
              border: active && !flat ? `1px solid ${activeTextColor}66` : '1px solid transparent',
              touchAction: 'manipulation',
            }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
