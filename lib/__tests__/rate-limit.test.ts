import { describe, it, expect } from 'vitest';
import { createSlidingWindowLimiter } from '../rate-limit';

describe('createSlidingWindowLimiter', () => {
  it('allows up to max hits in a window, then denies', () => {
    const limiter = createSlidingWindowLimiter({ windowMs: 1000, max: 3 });
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
  });

  it('tracks keys independently', () => {
    const limiter = createSlidingWindowLimiter({ windowMs: 1000, max: 2 });
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    expect(limiter.allow('b')).toBe(true);
  });

  it('frees budget as hits age out of the sliding window', () => {
    let t = 0;
    const limiter = createSlidingWindowLimiter({ windowMs: 1000, max: 2, now: () => t });
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    t = 1001;
    expect(limiter.allow('a')).toBe(true);
  });

  it('reset clears every bucket', () => {
    const limiter = createSlidingWindowLimiter({ windowMs: 1000, max: 1 });
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    limiter.reset();
    expect(limiter.allow('a')).toBe(true);
  });
});
