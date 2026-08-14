// Pure parsing helpers for the boxed OTP input (components/ui/OtpInput.tsx). Kept separate from
// the component so the part actually worth testing — sanitizing keystrokes and distributing a
// pasted code across boxes — doesn't need DOM/React test infra.

const DIGIT_ONLY = /\D/g;

// Sanitizes a single box's raw input to at most one digit. Multi-character input (e.g. typing
// over a selected char, or an IME quirk) keeps only the last digit typed.
export function sanitizeOtpChar(raw: string): string {
  const digits = raw.replace(DIGIT_ONLY, '');
  return digits.slice(-1);
}

// Distributes a pasted string across boxes starting at `startIndex`, stripping non-digit
// characters first (so pasting "123-456" or a code copied with surrounding text still works).
// Never writes past the end of `current` — extra pasted digits are dropped.
export function distributeOtpPaste(
  current: string[],
  pasted: string,
  startIndex: number
): string[] {
  const digits = pasted.replace(DIGIT_ONLY, '').split('');
  const next = [...current];
  for (let i = 0; i < digits.length && startIndex + i < next.length; i++) {
    next[startIndex + i] = digits[i];
  }
  return next;
}
