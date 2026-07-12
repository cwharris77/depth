import { describe, expect, it } from 'vitest';
import { parseAuthHash } from '../auth-hash';

describe('parseAuthHash', () => {
  it('extracts access_token and refresh_token from a valid fragment', () => {
    const hash = '#access_token=abc123&refresh_token=def456&expires_in=3600&token_type=bearer';
    expect(parseAuthHash(hash)).toEqual({
      status: 'tokens',
      accessToken: 'abc123',
      refreshToken: 'def456',
    });
  });

  it('works without the leading #', () => {
    const hash = 'access_token=abc123&refresh_token=def456';
    expect(parseAuthHash(hash)).toEqual({
      status: 'tokens',
      accessToken: 'abc123',
      refreshToken: 'def456',
    });
  });

  it('extracts an error message from an error fragment', () => {
    const hash =
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid';
    expect(parseAuthHash(hash)).toEqual({
      status: 'error',
      message: 'Email link is invalid',
    });
  });

  it('returns none for an empty fragment', () => {
    expect(parseAuthHash('')).toEqual({ status: 'none' });
  });

  it('returns none for a bare #', () => {
    expect(parseAuthHash('#')).toEqual({ status: 'none' });
  });

  it('returns none when only access_token is present (defensive — should not happen)', () => {
    expect(parseAuthHash('#access_token=abc123')).toEqual({ status: 'none' });
  });

  it('returns none for unrelated query-shaped garbage', () => {
    expect(parseAuthHash('#foo=bar&baz=qux')).toEqual({ status: 'none' });
  });
});
