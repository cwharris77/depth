// Parses the URL fragment GoTrue's implicit-flow magic-link redirect carries session tokens in
// (`#access_token=...&refresh_token=...`) or an error in (`#error=...&error_description=...`).
// Fragments never reach the server, so this can only ever run client-side, fed
// `window.location.hash` from components/AuthConfirm.tsx — see lib/supabase/client.ts's
// signInWithOtpImplicit for why implicit flow (not PKCE) is used for the sign-in request.

export type AuthHashResult =
  | { status: 'tokens'; accessToken: string; refreshToken: string }
  | { status: 'error'; message: string }
  | { status: 'none' };

export function parseAuthHash(hash: string): AuthHashResult {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const errorDescription = params.get('error_description');
  if (errorDescription) return { status: 'error', message: errorDescription };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { status: 'tokens', accessToken, refreshToken };

  return { status: 'none' };
}
