// Builds the first protected Vercel preview URL for browser QA.

// The dotenv/env var name a developer stores their bypass token under in `.env.local`.
// Underscore+caps (not Vercel's own hyphenated query-param name below) so tools that
// shell-source or otherwise parse .env.local as identifiers -- `supabase start` among
// them -- don't choke on it.
export const VERCEL_PROTECTION_BYPASS_ENV_KEY = 'X_VERCEL_PROTECTION_BYPASS';

// Vercel's own Protection Bypass for Automation query-param names -- fixed by Vercel's
// API contract, not a naming choice this repo controls. Distinct from the env key above.
export const VERCEL_PROTECTION_BYPASS_QUERY_KEY = 'x-vercel-protection-bypass';
export const VERCEL_SET_BYPASS_COOKIE_QUERY_KEY = 'x-vercel-set-bypass-cookie';

export function readDotenvValue(dotenv: string, key: string): string | undefined {
  for (const rawLine of dotenv.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');

    if (equalsIndex === -1 || line.slice(0, equalsIndex).trim() !== key) {
      continue;
    }

    const value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value;
  }

  return undefined;
}

export function withVercelProtectionBypass(input: string, token: string | undefined): string {
  const url = new URL(input);

  if (!token || !url.hostname.endsWith('.vercel.app')) {
    return input;
  }

  url.searchParams.set(VERCEL_PROTECTION_BYPASS_QUERY_KEY, token);
  url.searchParams.set(VERCEL_SET_BYPASS_COOKIE_QUERY_KEY, '1');

  return url.toString();
}
