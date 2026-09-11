// Shared env-var guard. Supabase client constructors need required config to fail loudly at
// call time rather than pass `undefined` into the SDK, which would fail later with a less
// useful error.
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Centralized Supabase URL resolution. Prefers the unprefixed secret var; falls back to
// the client-safe NEXT_PUBLIC_ pair.
export function getSupabaseUrl(): string {
  return requireEnv(
    'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL',
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

// Centralized Supabase anon/publishable key resolution. Prefers the unprefixed var;
// falls back to the client-safe NEXT_PUBLIC_ pair.
export function getSupabaseAnonKey(): string {
  return requireEnv(
    'SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

// Centralized Supabase secret key resolution. No fallback — this var must be set explicitly.
export function getSupabaseSecretKey(): string {
  return requireEnv('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY);
}

// Gates app/api/ingest/revalidate/route.ts (2026-08-20-ingest-cache-revalidation-design.md)
// — the ingest scripts' Bearer token, checked against this on every revalidate call.
export function getIngestRevalidateSecret(): string {
  return requireEnv('INGEST_REVALIDATE_SECRET', process.env.INGEST_REVALIDATE_SECRET);
}
