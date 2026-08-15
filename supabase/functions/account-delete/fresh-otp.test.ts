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
    ['ten-minute boundary', [{ method: 'otp', timestamp: now - 600 }]],
    ['refresh without OTP', [{ method: 'token_refresh', timestamp: now }]],
    ['future OTP', [{ method: 'otp', timestamp: now + 1 }]],
    ['missing AMR', undefined],
    ['malformed AMR', [{ method: 'otp', timestamp: 'recent' }]],
  ])('rejects %s', (_name, amr) => {
    expect(hasFreshOtp(amr, now)).toBe(false);
  });
});
