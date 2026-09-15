// Shared fresh-authentication policy for destructive account operations. It checks the
// verified JWT's authentication-method claim rather than issue time because token refresh
// can mint a new JWT without proving recent control of the account. Both an emailed OTP and
// a password grant count: each is a fresh proof of control the user just made, and the App
// Review demo account (DEP-562) authenticates by password grant rather than a mailbox it
// cannot read. The recency window still applies to whichever method is present.
const FRESH_AUTH_METHODS = new Set(['otp', 'password']);

export function hasFreshAuthentication(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr)) return false;

  return amr.some((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;

    const method = Reflect.get(entry, 'method');
    const timestamp = Reflect.get(entry, 'timestamp');
    if (typeof method !== 'string' || !FRESH_AUTH_METHODS.has(method)) return false;
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return false;

    const ageSeconds = nowSeconds - timestamp;
    return ageSeconds >= 0 && ageSeconds < 10 * 60;
  });
}
