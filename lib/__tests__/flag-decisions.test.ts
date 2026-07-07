import { describe, expect, it } from 'vitest';
import { decideShowUniformPicker } from '../flag-decisions';

describe('decideShowUniformPicker', () => {
  it('returns false when SHOW_UNIFORM_PICKER is unset', () => {
    expect(decideShowUniformPicker({})).toBe(false);
  });

  it('returns false when SHOW_UNIFORM_PICKER is not exactly "1"', () => {
    expect(decideShowUniformPicker({ SHOW_UNIFORM_PICKER: 'true' })).toBe(false);
    expect(decideShowUniformPicker({ SHOW_UNIFORM_PICKER: '' })).toBe(false);
  });

  it('returns true when SHOW_UNIFORM_PICKER=1', () => {
    expect(decideShowUniformPicker({ SHOW_UNIFORM_PICKER: '1' })).toBe(true);
  });
});
