import { describe, expect, it } from 'vitest';
import { isValidEmail } from '../email';

describe('isValidEmail', () => {
  it('accepts a plain address', () => {
    expect(isValidEmail('cooper@example.com')).toBe(true);
  });

  it('accepts an address with a subdomain and plus tag', () => {
    expect(isValidEmail('cooper+depth@mail.example.co')).toBe(true);
  });

  it('trims surrounding whitespace before checking', () => {
    expect(isValidEmail('  cooper@example.com  ')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('cooperexample.com')).toBe(false);
  });

  it('rejects a string with no domain', () => {
    expect(isValidEmail('cooper@')).toBe(false);
  });

  it('rejects a string with no TLD', () => {
    expect(isValidEmail('cooper@example')).toBe(false);
  });

  it('rejects a string containing spaces', () => {
    expect(isValidEmail('cooper @example.com')).toBe(false);
  });
});
