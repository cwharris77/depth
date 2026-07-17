// Shared env-var guard. Supabase client constructors need required config to fail loudly at
// call time rather than pass `undefined` into the SDK, which would fail later with a less
// useful error.
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
