'use client';

import { colors } from './tokens';

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: string;
};

// Standard on/off switch (e.g. "Open this team when I start the app"). Track fills
// accent when on; thumb slides 16px.
export default function Toggle({ checked, onChange, accent = colors.accent }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-150"
      style={{ background: checked ? accent : colors.borderInput, border: 'none' }}>
      <span
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform duration-150"
        style={{
          background: colors.textPrimary,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
