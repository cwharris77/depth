import { describe, expect, it } from 'vitest';
import { distributeOtpPaste, sanitizeOtpChar } from '../otp-input';

describe('sanitizeOtpChar', () => {
  it('passes through a single digit', () => {
    expect(sanitizeOtpChar('5')).toBe('5');
  });

  it('strips non-digit characters', () => {
    expect(sanitizeOtpChar('a')).toBe('');
  });

  it('keeps only the last digit when multiple are present', () => {
    expect(sanitizeOtpChar('12')).toBe('2');
  });

  it('returns empty for an empty string', () => {
    expect(sanitizeOtpChar('')).toBe('');
  });
});

describe('distributeOtpPaste', () => {
  it('fills boxes from the start index', () => {
    const current = ['', '', '', '', '', ''];
    expect(distributeOtpPaste(current, '1234', 0)).toEqual(['1', '2', '3', '4', '', '']);
  });

  it('fills from a non-zero start index', () => {
    const current = ['9', '', '', '', '', ''];
    expect(distributeOtpPaste(current, '234', 1)).toEqual(['9', '2', '3', '4', '', '']);
  });

  it('strips non-digit characters before distributing', () => {
    const current = ['', '', '', '', '', ''];
    expect(distributeOtpPaste(current, '12-345', 0)).toEqual(['1', '2', '3', '4', '5', '']);
  });

  it('truncates paste content past the end of the boxes', () => {
    const current = ['', '', '', '', '', ''];
    expect(distributeOtpPaste(current, '123456789', 0)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('does not mutate the input array', () => {
    const current = ['', '', '', '', '', ''];
    distributeOtpPaste(current, '123', 0);
    expect(current).toEqual(['', '', '', '', '', '']);
  });
});
