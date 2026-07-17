import { describe, expect, it } from 'vitest';
import { decideShowIsolatedSearchBarIcon } from '../flag-decisions';

describe('decideShowIsolatedSearchBarIcon', () => {
  it('returns false when SHOW_ISOLATED_SEARCH_BAR_ICON is unset', () => {
    expect(decideShowIsolatedSearchBarIcon({})).toBe(false);
  });

  it('returns true when SHOW_ISOLATED_SEARCH_BAR_ICON=1', () => {
    expect(decideShowIsolatedSearchBarIcon({ SHOW_ISOLATED_SEARCH_BAR_ICON: '1' })).toBe(true);
  });
});
