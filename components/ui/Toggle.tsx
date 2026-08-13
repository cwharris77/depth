'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';
import { colors } from './tokens';
import { focusRing } from '@/lib/colors';

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: string;
  className?: string;
};

// Standard on/off switch (e.g. "Open this team when I start the app"). Track fills
// accent when on; thumb slides 16px. Focus ring mirrors Input.tsx/OtpInput.tsx's glow
// pattern (accent @30% via inline handlers, no CSS-in-JS state) so keyboard nav is
// visible; thumb shadow gives it the depth flat background+thumb was missing.
export default function Toggle({
  checked,
  onChange,
  accent = colors.accent,
  className,
}: ToggleProps) {
  const [focused, setFocused] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full outline-none transition-[background-color,box-shadow] duration-150 ease-out',
        className
      )}
      style={{
        background: checked ? accent : colors.borderInput,
        border: 'none',
        boxShadow: focused ? focusRing(accent) : 'none',
      }}>
      <span
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform duration-150 ease-out"
        style={{
          background: colors.textPrimary,
          boxShadow: colors.shadowThumb,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
