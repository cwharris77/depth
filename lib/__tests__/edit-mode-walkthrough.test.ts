import { describe, it, expect } from 'vitest';
import {
  dismissEditModeWalkthrough,
  hasDismissedEditModeWalkthrough,
} from '../edit-mode-walkthrough';

// Minimal Storage stand-in so these tests don't depend on a DOM/localStorage environment —
// same pattern as lib/__tests__/nav-drawer-coachmark.test.ts.
function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    store,
  };
}

describe('hasDismissedEditModeWalkthrough / dismissEditModeWalkthrough', () => {
  it('is not dismissed by default', () => {
    expect(hasDismissedEditModeWalkthrough(fakeStorage())).toBe(false);
  });

  it('is dismissed after dismissEditModeWalkthrough writes the flag', () => {
    const storage = fakeStorage();
    dismissEditModeWalkthrough(storage);
    expect(hasDismissedEditModeWalkthrough(storage)).toBe(true);
  });

  it('degrades to not-dismissed when storage.getItem throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(hasDismissedEditModeWalkthrough(storage)).toBe(false);
  });

  it('degrades silently when storage.setItem throws', () => {
    const storage = {
      setItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(() => dismissEditModeWalkthrough(storage)).not.toThrow();
  });
});
