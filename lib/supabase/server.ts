// Server Supabase client for auth (Phase C, auth pass 1). Reads/writes the session
// cookies via next/headers so route handlers and server components can identify the
// signed-in user and let RLS scope rows to them. Per the @supabase/ssr server-client
// docs: https://supabase.com/docs/guides/auth/server-side/creating-a-client.
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

export async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components can't set cookies; the proxy (session refresh) is the
          // writer, so a throw here is expected and safely ignored. Route handlers
          // and the auth-confirm route CAN set them, so this still runs there.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — ignore.
          }
        },
      },
    }
  );
}
