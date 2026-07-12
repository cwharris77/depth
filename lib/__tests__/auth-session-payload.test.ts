import { describe, expect, it } from 'vitest';
import { parseSetSessionBody } from '../auth-session-payload';

describe('parseSetSessionBody', () => {
  it('parses a valid payload', () => {
    expect(parseSetSessionBody({ accessToken: 'abc', refreshToken: 'def' })).toEqual({
      accessToken: 'abc',
      refreshToken: 'def',
    });
  });

  it('rejects a missing accessToken', () => {
    expect(parseSetSessionBody({ refreshToken: 'def' })).toBeNull();
  });

  it('rejects a missing refreshToken', () => {
    expect(parseSetSessionBody({ accessToken: 'abc' })).toBeNull();
  });

  it('rejects non-string fields', () => {
    expect(parseSetSessionBody({ accessToken: 1, refreshToken: 'def' })).toBeNull();
  });

  it('rejects empty-string fields', () => {
    expect(parseSetSessionBody({ accessToken: '', refreshToken: 'def' })).toBeNull();
  });

  it('rejects null', () => {
    expect(parseSetSessionBody(null)).toBeNull();
  });

  it('rejects an array', () => {
    expect(parseSetSessionBody(['abc', 'def'])).toBeNull();
  });

  it('rejects a plain string', () => {
    expect(parseSetSessionBody('not an object')).toBeNull();
  });

  it('rejects undefined', () => {
    expect(parseSetSessionBody(undefined)).toBeNull();
  });
});
