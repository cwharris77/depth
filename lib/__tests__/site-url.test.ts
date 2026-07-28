import { describe, expect, it } from 'vitest';
import { getSiteUrl } from '../site-url';

describe('getSiteUrl', () => {
  it('prefers the Vercel production URL over a stale public site URL', () => {
    expect(
      getSiteUrl({
        VERCEL_PROJECT_PRODUCTION_URL: 'depth.example.com',
        NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      })
    ).toBe('https://depth.example.com');
  });

  it('uses the preview deployment URL when there is no production URL', () => {
    expect(getSiteUrl({ VERCEL_URL: 'depth-git-feature.vercel.app' })).toBe(
      'https://depth-git-feature.vercel.app'
    );
  });

  it('preserves an explicit protocol and falls back to localhost for local dev', () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://depth.app' })).toBe('https://depth.app');
    expect(getSiteUrl({})).toBe('http://localhost:3000');
  });
});
