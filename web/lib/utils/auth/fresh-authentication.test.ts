// Boundary tests for the shared fresh-authentication policy. These intentionally exercise
// malformed claim shapes because AMR data crosses a signed-but-still-untyped JWT boundary.
import { describe, expect, it } from 'vitest';
import { hasFreshAuthentication } from './fresh-authentication';

describe('hasFreshAuthentication', () => {
  const now = 2_000_000_000;

  it('accepts an OTP authentication within the ten-minute window', () => {
    expect(
      hasFreshAuthentication(
        [
          { method: 'otp', timestamp: now - 599 },
          { method: 'token_refresh', timestamp: now },
        ],
        now
      )
    ).toBe(true);
  });

  // The App Review demo account signs in with a password grant, not an emailed OTP,
  // so a recent password authentication must satisfy the same fresh-auth gate.
  it('accepts a password authentication within the ten-minute window', () => {
    expect(
      hasFreshAuthentication(
        [
          { method: 'password', timestamp: now - 599 },
          { method: 'token_refresh', timestamp: now },
        ],
        now
      )
    ).toBe(true);
  });

  it.each([
    ['missing AMR', undefined],
    ['stale OTP', [{ method: 'otp', timestamp: now - 600 }]],
    ['future OTP', [{ method: 'otp', timestamp: now + 1 }]],
    ['stale password', [{ method: 'password', timestamp: now - 600 }]],
    ['non-fresh method', [{ method: 'oauth', timestamp: now - 1 }]],
    ['refresh only', [{ method: 'token_refresh', timestamp: now }]],
    ['malformed timestamp', [{ method: 'otp', timestamp: 'recent' }]],
  ])('rejects %s', (_, amr) => {
    expect(hasFreshAuthentication(amr, now)).toBe(false);
  });
});
