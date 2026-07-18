'use client';

import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { colors } from './tokens';

type InputProps = {
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  accent?: string;
  inputMode?: 'text' | 'email' | 'numeric' | 'tel' | 'url' | 'search' | 'none' | 'decimal';
  autoComplete?: string;
  ariaLabel?: string;
};

// Text/email input — one style everywhere. Focus swaps a glow (accent @30%) in via
// inline handlers (no CSS-in-JS/classes for state in the source app), mirroring the
// pattern OtpInput.tsx already uses for its own per-box focus glow.
export default function Input({
  type = 'text',
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  accent = colors.accent,
  inputMode,
  autoComplete,
  ariaLabel,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full rounded-xl px-4 py-3 text-base outline-none transition-shadow duration-150"
      style={{
        background: colors.surfaceInput,
        border: `1px solid ${focused ? accent : colors.borderInput}`,
        color: colors.textPrimary,
        boxShadow: focused ? `0 0 0 3px ${accent}4d` : 'none',
      }}
    />
  );
}
