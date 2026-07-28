// Builds the first protected Vercel preview URL for browser QA. The bypass token is a
// hyphenated key in `.env.local`, so scripts parse the file directly instead of trying
// to shell-source an env name most shells reject.

export const VERCEL_PROTECTION_BYPASS_KEY = 'x-vercel-protection-bypass';
export const VERCEL_SET_BYPASS_COOKIE_KEY = 'x-vercel-set-bypass-cookie';

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

  url.searchParams.set(VERCEL_PROTECTION_BYPASS_KEY, token);
  url.searchParams.set(VERCEL_SET_BYPASS_COOKIE_KEY, '1');

  return url.toString();
}
