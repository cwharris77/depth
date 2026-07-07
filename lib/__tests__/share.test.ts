import { describe, it, expect } from 'vitest';
import {
  decodeDepthOrder,
  encodeDepthOrder,
  playerDeepLinkPath,
  rosterShareUrlPath,
} from '../share';
import type { TeamDepthOverride } from '../depth-overrides';

describe('playerDeepLinkPath', () => {
  it('builds the team page path with the player as a query param', () => {
    expect(playerDeepLinkPath('seahawks', 'abc123')).toBe('/team/seahawks?player=abc123');
  });

  it("url-encodes ids so odd characters can't break the link", () => {
    expect(playerDeepLinkPath('a b', 'x&y=z')).toBe('/team/a%20b?player=x%26y%3Dz');
  });
});

describe('encodeDepthOrder / decodeDepthOrder', () => {
  it('round-trips an override', () => {
    const override: TeamDepthOverride = {
      QB: ['p1', 'p2'],
      WR: ['p3', 'p4', 'p5'],
    };
    expect(decodeDepthOrder(encodeDepthOrder(override))).toEqual(override);
  });

  it('produces a url-safe token (no +, /, or = padding)', () => {
    const token = encodeDepthOrder({ WR: ['a', 'b', 'c', 'd'] });
    expect(token).not.toMatch(/[+/=]/);
  });

  it('returns null for malformed input rather than throwing', () => {
    expect(decodeDepthOrder('not-base64-$$$')).toBeNull();
    expect(decodeDepthOrder(encodeDepthOrder({} as TeamDepthOverride))).toEqual({});
  });

  it("rejects a decoded value that isn't an object of string arrays", () => {
    const asToken = (v: unknown) =>
      Buffer.from(JSON.stringify(v)).toString('base64').replace(/=+$/, '');
    expect(decodeDepthOrder(asToken([1, 2, 3]))).toBeNull();
    expect(decodeDepthOrder(asToken({ QB: [1, 2] }))).toBeNull();
    expect(decodeDepthOrder(asToken('nope'))).toBeNull();
  });
});

describe('rosterShareUrlPath', () => {
  it('is the clean team path when there are no edits', () => {
    expect(rosterShareUrlPath('seahawks', {})).toBe('/team/seahawks');
  });

  it('carries the packed order when there are edits, and round-trips', () => {
    const override: TeamDepthOverride = { QB: ['p2', 'p1'] };
    const path = rosterShareUrlPath('seahawks', override);
    expect(path.startsWith('/team/seahawks?order=')).toBe(true);
    const token = path.split('order=')[1];
    expect(decodeDepthOrder(token)).toEqual(override);
  });
});
