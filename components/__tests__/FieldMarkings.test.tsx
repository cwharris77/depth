import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FieldMarkings from '../FieldMarkings';

describe('FieldMarkings', () => {
  it('paints two-digit yard numbers 10-50-10 mirrored on both sidelines', () => {
    const { container } = render(<FieldMarkings />);
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    // Real fields paint two-digit numbers counting up to the 50 and back down. Each
    // sideline column runs 10-20-30-40-50-40-30-20-10 (9 numbers), so every value
    // 10/20/30/40 appears exactly 4x (two mirrored numbers x both sidelines) and the
    // unique midfield 50 exactly 2x (once per sideline).
    for (const n of ['10', '20', '30', '40']) {
      expect(texts.filter((t) => t === n).length).toBe(4);
    }
    expect(texts.filter((t) => t === '50').length).toBe(2);
    // 9 ten-yard increments x 2 sidelines.
    expect(texts).toHaveLength(18);
    // Painted white, like real field paint (not a chrome grey).
    for (const t of container.querySelectorAll('text')) {
      expect(t.getAttribute('fill')).toBe('#fff');
    }
  });

  it('splits digits around the yard line with a visible gap (2 | 0)', () => {
    const { container } = render(<FieldMarkings />);
    // Numbers anchor centered ON their yard line; wide letter-spacing opens the gap
    // so the line passes between the digits ("2 | 0") with clear space either side.
    const texts = Array.from(container.querySelectorAll('text'));
    for (const t of texts) {
      expect(Number(t.getAttribute('y')) % 10).toBe(0);
      expect(Number(t.getAttribute('letter-spacing'))).toBeGreaterThanOrEqual(3);
    }
    // The two 50s sit exactly at midfield, under the blue line-of-scrimmage overlay.
    expect(texts.filter((t) => t.getAttribute('y') === '50')).toHaveLength(2);
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
    expect(container.querySelectorAll('g.hidden text').length).toBe(18);
  });

  it('mirrors the rotation so each sideline reads from its own side', () => {
    const { container } = render(<FieldMarkings />);
    // Left column rotates +90 (reads for a viewer on the left sideline), right column
    // -90 (reads for a viewer on the right sideline) — the two rows mirror each other
    // the way real fields paint them.
    const rotations = Array.from(container.querySelectorAll('g.hidden g, g.hidden text'))
      .map((el) => el.getAttribute('transform'))
      .filter((t): t is string => t !== null);
    expect(rotations.some((t) => t.includes('rotate(90'))).toBe(true);
    expect(rotations.some((t) => t.includes('rotate(-90'))).toBe(true);
  });
});
