import { describe, it, expect } from 'vitest';
import {
  dismissInstallHint,
  hasDismissedInstallHint,
  isIOSSafari,
  isStandaloneDisplay,
} from '../ios-install-hint';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
// iPadOS 13+ Safari reports as a plain Mac UA; only touch capability distinguishes it.
const IPADOS_MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const REAL_MAC_UA = IPADOS_MAC_UA;
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.79 Mobile/15E148 Safari/604.1';
const IPHONE_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126.0 Mobile/15E148 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

describe('isIOSSafari', () => {
  it('matches iPhone Safari', () => {
    expect(isIOSSafari(IPHONE_SAFARI, 5)).toBe(true);
  });

  it('matches iPad Safari (iPad in UA)', () => {
    expect(isIOSSafari(IPAD_SAFARI, 5)).toBe(true);
  });

  it('matches iPadOS 13+ Safari (Mac UA + touch points)', () => {
    expect(isIOSSafari(IPADOS_MAC_UA, 5)).toBe(true);
  });

  it('does not match a real Mac (Mac UA, no touch points)', () => {
    expect(isIOSSafari(REAL_MAC_UA, 0)).toBe(false);
  });

  it('does not match Chrome on iOS', () => {
    expect(isIOSSafari(IPHONE_CHROME, 5)).toBe(false);
  });

  it('does not match Firefox on iOS', () => {
    expect(isIOSSafari(IPHONE_FIREFOX, 5)).toBe(false);
  });

  it('does not match Chrome on Android', () => {
    expect(isIOSSafari(ANDROID_CHROME, 5)).toBe(false);
  });

  it('does not match desktop Chrome', () => {
    expect(isIOSSafari(DESKTOP_CHROME, 0)).toBe(false);
  });
});

describe('isStandaloneDisplay', () => {
  it('is true when navigator.standalone is true', () => {
    expect(isStandaloneDisplay(true, false)).toBe(true);
  });

  it('is true when the display-mode media query matches', () => {
    expect(isStandaloneDisplay(undefined, true)).toBe(true);
  });

  it('is false when neither signal is set', () => {
    expect(isStandaloneDisplay(undefined, false)).toBe(false);
  });

  it('is false when navigator.standalone is explicitly false', () => {
    expect(isStandaloneDisplay(false, false)).toBe(false);
  });
});

// Minimal Storage stand-in so these tests don't depend on a DOM/localStorage environment.
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

describe('hasDismissedInstallHint / dismissInstallHint', () => {
  it('is not dismissed by default', () => {
    expect(hasDismissedInstallHint(fakeStorage())).toBe(false);
  });

  it('is dismissed after dismissInstallHint writes the flag', () => {
    const storage = fakeStorage();
    dismissInstallHint(storage);
    expect(hasDismissedInstallHint(storage)).toBe(true);
  });

  it('degrades to not-dismissed when storage.getItem throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(hasDismissedInstallHint(storage)).toBe(false);
  });

  it('degrades silently when storage.setItem throws', () => {
    const storage = {
      setItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(() => dismissInstallHint(storage)).not.toThrow();
  });
});
