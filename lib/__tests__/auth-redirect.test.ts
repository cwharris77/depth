import { describe, expect, it } from 'vitest';
import { safeNext } from '../auth-redirect';

describe('safeNext', () => {
  it('returns a valid relative path unchanged', () => {
    expect(safeNext('/team/seahawks')).toBe('/team/seahawks');
  });

  it('falls back to home for undefined', () => {
    expect(safeNext(undefined)).toBe('/');
  });

  it('falls back to home for an array (repeated query param)', () => {
    expect(safeNext(['/a', '/b'])).toBe('/');
  });

  it('rejects a protocol-relative URL (open-redirect risk)', () => {
    expect(safeNext('//evil.com')).toBe('/');
  });

  it('rejects an absolute URL', () => {
    expect(safeNext('https://evil.com')).toBe('/');
  });

  it('rejects an empty string', () => {
    expect(safeNext('')).toBe('/');
  });

  it('rejects a path with no leading slash', () => {
    expect(safeNext('team/seahawks')).toBe('/');
  });
});
