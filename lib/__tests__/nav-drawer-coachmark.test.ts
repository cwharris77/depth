import { describe, it, expect } from 'vitest';
import { dismissNavDrawerCoachmark, hasDismissedNavDrawerCoachmark } from '../nav-drawer-coachmark';

// Minimal Storage stand-in so these tests don't depend on a DOM/localStorage environment —
// same pattern as lib/__tests__/ios-install-hint.test.ts.
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

describe('hasDismissedNavDrawerCoachmark / dismissNavDrawerCoachmark', () => {
  it('is not dismissed by default', () => {
    expect(hasDismissedNavDrawerCoachmark(fakeStorage())).toBe(false);
  });

  it('is dismissed after dismissNavDrawerCoachmark writes the flag', () => {
    const storage = fakeStorage();
    dismissNavDrawerCoachmark(storage);
    expect(hasDismissedNavDrawerCoachmark(storage)).toBe(true);
  });

  it('degrades to not-dismissed when storage.getItem throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(hasDismissedNavDrawerCoachmark(storage)).toBe(false);
  });

  it('degrades silently when storage.setItem throws', () => {
    const storage = {
      setItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(() => dismissNavDrawerCoachmark(storage)).not.toThrow();
  });
});
