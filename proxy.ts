// Session refresh (Phase C, auth pass 1). Next 16 renamed middleware -> proxy
// (node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md). Runs before each
// matched request, refreshes the Supabase auth session, and writes the rotated cookies
// onto the response so server components see a live session. This is the ONE cookie
// writer for refresh — the server client's setAll is a no-op in Server Components.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  // Everything except static assets, image optimizer, icons, and the public player-search
  // endpoint (no session needed there — it stays fast and cacheable).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest|api/players/search|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
