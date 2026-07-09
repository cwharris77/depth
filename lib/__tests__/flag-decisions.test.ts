import { describe, expect, it } from 'vitest';
import { decideShowUniformPicker, decideShowUniformArchive } from '../flag-decisions';

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

describe('decideShowUniformArchive', () => {
  it('is on only when SHOW_UNIFORM_ARCHIVE is exactly "1"', () => {
    expect(decideShowUniformArchive({ SHOW_UNIFORM_ARCHIVE: '1' })).toBe(true);
    expect(decideShowUniformArchive({ SHOW_UNIFORM_ARCHIVE: 'true' })).toBe(false);
    expect(decideShowUniformArchive({})).toBe(false);
  });
});
