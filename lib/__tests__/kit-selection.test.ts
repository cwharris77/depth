import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getKitId, setKitId, clearKitId } from '../kit-selection';

// Mock localStorage for SSR-safe testing.
const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => store.clear()),
  get length() {
    return store.size;
  },
  key: vi.fn((index: number) => [...store.keys()][index] ?? null),
};

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  // Simulate a browser-like environment for the persistence tests.
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: localStorageMock },
    writable: true,
    configurable: true,
  });
});

describe('getKitId', () => {
  it('returns undefined when nothing is stored', () => {
    expect(getKitId('SEA')).toBeUndefined();
  });

  it('returns the stored kit id for a team', () => {
    setKitId('SEA', 'SEA-home');
    expect(getKitId('SEA')).toBe('SEA-home');
  });

  it('returns undefined for a team that has no stored kit', () => {
    setKitId('SEA', 'SEA-home');
    expect(getKitId('SF')).toBeUndefined();
  });

  it('returns undefined when window is undefined (SSR)', () => {
    delete (globalThis as any).window;
    expect(getKitId('SEA')).toBeUndefined();
  });

  it('returns undefined on corrupt JSON', () => {
    localStorageMock.getItem.mockReturnValueOnce('not-json');
    expect(getKitId('SEA')).toBeUndefined();
  });
});

describe('setKitId', () => {
  it('persists a kit id for a team', () => {
    setKitId('SEA', 'SEA-home');
    expect(getKitId('SEA')).toBe('SEA-home');
  });

  it('overwrites an existing kit id for the same team', () => {
    setKitId('SEA', 'SEA-home');
    setKitId('SEA', 'SEA-away');
    expect(getKitId('SEA')).toBe('SEA-away');
  });

  it('stores multiple teams independently', () => {
    setKitId('SEA', 'SEA-home');
    setKitId('SF', 'SF-away');
    expect(getKitId('SEA')).toBe('SEA-home');
    expect(getKitId('SF')).toBe('SF-away');
  });

  it('does not throw when window is undefined (SSR)', () => {
    delete (globalThis as any).window;
    expect(() => setKitId('SEA', 'SEA-home')).not.toThrow();
  });
});

describe('clearKitId', () => {
  it('removes the stored kit id for a team', () => {
    setKitId('SEA', 'SEA-home');
    clearKitId('SEA');
    expect(getKitId('SEA')).toBeUndefined();
  });

  it('does not affect other teams', () => {
    setKitId('SEA', 'SEA-home');
    setKitId('SF', 'SF-away');
    clearKitId('SEA');
    expect(getKitId('SF')).toBe('SF-away');
  });

  it('is a no-op when no kit is stored for the team', () => {
    expect(() => clearKitId('SEA')).not.toThrow();
  });

  it('does not throw when window is undefined (SSR)', () => {
    delete (globalThis as any).window;
    expect(() => clearKitId('SEA')).not.toThrow();
  });
});
