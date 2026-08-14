import { describe, expect, it } from 'vitest';

import {
  readDotenvValue,
  VERCEL_PROTECTION_BYPASS_ENV_KEY,
  VERCEL_PROTECTION_BYPASS_QUERY_KEY,
  VERCEL_SET_BYPASS_COOKIE_QUERY_KEY,
  withVercelProtectionBypass,
} from '@/lib/utils/vercel-preview-bypass';

describe('vercel preview bypass', () => {
  it('appends the bypass token and cookie flag to vercel previews', () => {
    const url = new URL(
      withVercelProtectionBypass('https://depth-git-feature-cwharris77.vercel.app/team/ari', 'dev')
    );

    expect(url.searchParams.get(VERCEL_PROTECTION_BYPASS_QUERY_KEY)).toBe('dev');
    expect(url.searchParams.get(VERCEL_SET_BYPASS_COOKIE_QUERY_KEY)).toBe('1');
  });

  it('preserves existing params and hash', () => {
    expect(
      withVercelProtectionBypass('https://depth-git-feature.vercel.app/compare?a=ari#table', 'dev')
    ).toBe(
      'https://depth-git-feature.vercel.app/compare?a=ari&x-vercel-protection-bypass=dev&x-vercel-set-bypass-cookie=1#table'
    );
  });

  it('leaves non-vercel urls alone', () => {
    expect(withVercelProtectionBypass('http://localhost:3000/team/ari', 'dev')).toBe(
      'http://localhost:3000/team/ari'
    );
  });

  it('reads the token key from dotenv text', () => {
    expect(readDotenvValue(`${VERCEL_PROTECTION_BYPASS_ENV_KEY}='dev'\nOTHER=value`, 'OTHER')).toBe(
      'value'
    );
    expect(
      readDotenvValue(
        `${VERCEL_PROTECTION_BYPASS_ENV_KEY}='dev'\nOTHER=value`,
        VERCEL_PROTECTION_BYPASS_ENV_KEY
      )
    ).toBe('dev');
  });
});
