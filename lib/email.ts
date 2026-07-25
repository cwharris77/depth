// Client-side email format check for the OTP sign-in form (components/AccountView.tsx). Not a
// deliverability guarantee — Supabase's signInWithOtp is the real validator — this only catches
// obviously malformed input before we burn a send attempt on it. Untrusted input degrades to
// `false`, never throws (AGENTS.md invariant 6).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
