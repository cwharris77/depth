import { describe, it, expect } from 'vitest';
import { newSlug } from '../slug';

describe('newSlug', () => {
  it('is 10 chars by default', () => {
    expect(newSlug()).toHaveLength(10);
  });

  it('honors a custom length', () => {
    expect(newSlug(16)).toHaveLength(16);
  });

  it('uses only [A-Za-z0-9]', () => {
    for (let i = 0; i < 100; i++) {
      expect(newSlug()).toMatch(/^[A-Za-z0-9]+$/);
    }
  });

  it('is effectively unique over 1000 draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(newSlug());
    expect(seen.size).toBe(1000);
  });
});
