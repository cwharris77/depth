import { describe, expect, it } from 'vitest';
import { parseSeasonsArg } from './seasons-arg';

describe('parseSeasonsArg', () => {
  it('returns null when the flag is absent', () => {
    expect(parseSeasonsArg([])).toBeNull();
  });

  it('parses a range into an inclusive array', () => {
    expect(parseSeasonsArg(['--seasons', '1999-2001'])).toEqual([1999, 2000, 2001]);
  });

  it('parses a single year', () => {
    expect(parseSeasonsArg(['--seasons', '2013'])).toEqual([2013]);
  });

  it('throws on a backwards range', () => {
    expect(() => parseSeasonsArg(['--seasons', '2025-1999'])).toThrow(/backwards/);
  });

  it('throws when the flag has no value', () => {
    expect(() => parseSeasonsArg(['--seasons'])).toThrow(/requires a value/);
  });

  it('throws on a value that is neither a year nor a range', () => {
    expect(() => parseSeasonsArg(['--seasons', 'abc'])).toThrow(/not a year or range/);
  });
});
