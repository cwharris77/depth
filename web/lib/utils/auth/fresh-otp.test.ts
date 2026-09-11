// Boundary tests for the shared fresh-OTP policy. These intentionally exercise malformed
// claim shapes because AMR data crosses a signed-but-still-untyped JWT boundary.
import { describe, expect, it } from 'vitest';
import { hasFreshOtp } from './fresh-otp';

describe('hasFreshOtp', () => {
  const now = 2_000_000_000;

  it('accepts an OTP authentication within the ten-minute window', () => {
    expect(
      hasFreshOtp(
        [
          { method: 'otp', timestamp: now - 599 },
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
    ['refresh only', [{ method: 'token_refresh', timestamp: now }]],
    ['malformed timestamp', [{ method: 'otp', timestamp: 'recent' }]],
  ])('rejects %s', (_, amr) => {
    expect(hasFreshOtp(amr, now)).toBe(false);
  });
});
