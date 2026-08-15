// Shared fresh-authentication policy for destructive account operations. It checks the
// verified JWT's authentication-method claim rather than issue time because token refresh
// can mint a new JWT without proving recent control of the user's email inbox.
export function hasFreshOtp(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr)) return false;

  return amr.some((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;

    const method = Reflect.get(entry, 'method');
    const timestamp = Reflect.get(entry, 'timestamp');
    if (method !== 'otp' || typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      return false;
    }

    const ageSeconds = nowSeconds - timestamp;
    return ageSeconds >= 0 && ageSeconds < 10 * 60;
  });
}
