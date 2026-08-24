import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FieldMarkings from '../FieldMarkings';

describe('FieldMarkings', () => {
  it('paints a yard number on both sidelines for every ten-yard increment', () => {
    const { container } = render(<FieldMarkings />);
    // Numbers are mirrored around midfield, so every value 1–4 appears exactly four
    // times: two numbers (e.g. the two 20s) × both sidelines. There is no "5" —
    // midfield is the blue line-of-scrimmage line, not a numbered yard line.
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    for (const n of ['1', '2', '3', '4']) {
      expect(texts.filter((t) => t === n).length).toBe(4);
    }
    expect(texts.filter((t) => t === '5')).toHaveLength(0);
    // No numbers in the end zones or on the line of scrimmage.
    expect(texts.filter((t) => t === '0')).toHaveLength(0);
    // 8 ten-yard increments × 2 sidelines.
    expect(texts).toHaveLength(16);
  });

  it('hides the numbers below the lg breakpoint (mobile dot-only field)', () => {
    const { container } = render(<FieldMarkings />);
    const groups = Array.from(container.querySelectorAll('g.hidden'));
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.getAttribute('class')).toContain('hidden lg:block');
      // Every yard number lives inside one of those breakpoint groups.
      expect(g.querySelector('text')).not.toBeNull();
    }
    expect(container.querySelectorAll('g.hidden text').length).toBe(16);
  });
});
