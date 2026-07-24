// Session refresh (Phase C, auth pass 1). Next 16 renamed middleware -> proxy
// (node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md). Runs before each
// matched request, refreshes the Supabase auth session, and writes the rotated cookies
// onto the response so server components see a live session.
//
// Scoped to `/` only (see matcher below) — it's the one route that reads auth server-side
// from a Server Component, which can't write cookies back itself (getServerClient's
// setAll is a no-op there), so it's the one place this refresh actually needs to happen
// ahead of the render. Every other route is public (team/stats/schedule/uniforms/compare)
// or reads auth from a Route Handler (api/settings, api/account/delete, api/share,
// api/shares/[slug]) — Route Handlers CAN write cookies via their own getServerClient
// call, so they refresh themselves without this. Client-side auth state (useUser(),
// RememberTeam) goes through the browser Supabase client, independent of this refresh
// entirely. Running this on every request was a real, measured perf cost (a live network
// round-trip to Supabase ahead of Next's cache/CDN layer, on routes that never needed
// it) — see "Depth field slow to load — general performance pass" in the vault.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { requireEnv } from '@/lib/env';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session if expired; do not run code between createServerClient and
  // getUser or you risk logging users out at random (per the @supabase/ssr docs).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/'],
};
