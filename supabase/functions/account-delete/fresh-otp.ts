// Validates the authentication-method claim used by the privileged account-deletion
// boundary. JWT issue time is intentionally ignored because token refresh can mint a
// new JWT without proving that the user recently controlled their email inbox.
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
