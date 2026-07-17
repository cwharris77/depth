'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import { distributeOtpPaste, sanitizeOtpChar } from '@/lib/otp-input';
import { colors } from './tokens';

type OtpInputProps = {
  length?: number;
  onChange: (code: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
};

// Boxed one-time-code input — the design system's first primitive (components/ui/). One box per
// digit with a brand-green focus glow, replacing a single free-text field: typing auto-advances,
// backspace on an empty box steps back to the previous one, and pasting a full code (from
// anywhere — the start box, the middle, a password manager) distributes across all boxes at
// once. Uncontrolled internally — reports the joined code via onChange on every keystroke, same
// as a plain text input, so the parent (components/AccountView.tsx) keeps owning `code` state
// and its existing disabled/error handling unchanged. Resets naturally when unmounted (the
// parent only renders this while sendState === 'sent', so "Use a different email" clears it by
// unmounting rather than needing an explicit reset prop).
export default function OtpInput({ length = 6, onChange, onEnter, disabled }: OtpInputProps) {
  const [boxes, setBoxes] = useState<string[]>(() => Array(length).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const commit = (next: string[]) => {
    setBoxes(next);
    onChange(next.join(''));
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const char = sanitizeOtpChar(e.target.value);
    const next = [...boxes];
    next[index] = char;
    commit(next);
    if (char && index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !boxes[index] && index > 0) {
      focusBox(index - 1);
    } else if (e.key === 'Enter') {
      onEnter?.();
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const next = distributeOtpPaste(boxes, e.clipboardData.getData('text'), index);
    commit(next);
    const lastFilledIndex = next.reduce((last, c, i) => (c ? i : last), -1);
    focusBox(Math.min(lastFilledIndex + 1, length - 1));
  };

  return (
    <div className="flex gap-2.5" role="group" aria-label={`${length}-digit sign-in code`}>
      {boxes.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={char}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          aria-label={`Digit ${i + 1} of ${length}`}
          className="h-14 w-11 rounded-xl text-center text-xl font-bold outline-none transition-shadow duration-150"
          style={{
            background: colors.surfaceInput,
            border: `1px solid ${colors.borderInput}`,
            color: colors.textPrimary,
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.focusRing}`;
            e.currentTarget.style.borderColor = colors.accent;
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = colors.borderInput;
          }}
        />
      ))}
    </div>
  );
}
