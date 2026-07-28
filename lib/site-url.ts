function absoluteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

interface SiteUrlEnv {
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

// Vercel exposes deployment origins without a protocol. Prefer those over
// NEXT_PUBLIC_SITE_URL so production/preview metadata follows the actual deployment even
// when a local/public env fallback is stale.
export function getSiteUrl(env: SiteUrlEnv = process.env as SiteUrlEnv): string {
  return (
    absoluteUrl(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    absoluteUrl(env.VERCEL_URL) ??
    absoluteUrl(env.NEXT_PUBLIC_SITE_URL) ??
    'http://localhost:3000'
  );
}
