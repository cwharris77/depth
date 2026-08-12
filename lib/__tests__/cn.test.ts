import { describe, expect, it } from 'vitest';
import { cn } from '../utils';

describe('cn / twMerge caller-over-base precedence', () => {
  it('caller class wins over base class for conflicting utilities', () => {
    expect(cn('px-5', 'px-3')).toBe('px-3');
  });

  it('caller class wins over base class for conflicting padding utilities', () => {
    expect(cn('py-2', 'py-4')).toBe('py-4');
  });

  it('caller class wins over base class for conflicting text-size utilities', () => {
    expect(cn('text-[10px]', 'text-xs')).toBe('text-xs');
  });

  it('non-conflicting base and caller classes are both present', () => {
    const result = cn('px-5 py-2', 'text-[10px]');
    expect(result).toContain('px-5');
    expect(result).toContain('py-2');
    expect(result).toContain('text-[10px]');
  });

  it('caller class wins over base class for conflicting flex utilities', () => {
    expect(cn('w-full', 'w-fit')).toBe('w-fit');
  });

  it('caller class wins over base class for conflicting font utilities', () => {
    expect(cn('font-bold', 'font-normal')).toBe('font-normal');
  });

  it('multiple base classes merge with caller classes correctly', () => {
    const result = cn(
      'inline-flex items-center justify-center gap-2 font-bold px-5 py-3 text-sm rounded-xl',
      'px-3 py-2'
    );
    expect(result).toContain('inline-flex');
    expect(result).toContain('items-center');
    expect(result).toContain('justify-center');
    expect(result).toContain('gap-2');
    expect(result).toContain('font-bold');
    expect(result).toContain('text-sm');
    expect(result).toContain('rounded-xl');
    expect(result).toContain('px-3');
    expect(result).toContain('py-2');
    expect(result).not.toContain('px-5');
    expect(result).not.toContain('py-3');
  });

  it('falsy values are ignored', () => {
    const skip = false;
    expect(cn('px-5', skip && 'px-3')).toBe('px-5');
  });

  it('undefined className does not affect base classes', () => {
    expect(cn('px-5 py-2', undefined)).toBe('px-5 py-2');
  });
});
