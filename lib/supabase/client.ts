// Browser Supabase client for auth (Phase C, auth pass 1). The app's data reads still go
// through dbRosterSource with the server-side anon key; this client exists only so the
// browser can run the magic-link sign-in flow and observe auth state. Singleton — one
// client per tab keeps a single auth/session listener and cookie writer.
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// @supabase/ssr's createBrowserClient hard-codes flowType: 'pkce' (splats it after spreading
// caller-supplied auth options in createBrowserClient.js — there is no supported override; a
// Supabase maintainer confirmed this is intentional in supabase/ssr#175, recommending exactly
// this workaround). PKCE requires the emailed magic link to be opened in the same browser that
// requested it (a code_verifier cookie set at request time), which breaks when the link opens in
// a different app/browser than the one signed in from. Routing the OTP request through a bare
// @supabase/supabase-js client with flowType: 'implicit' avoids that — GoTrue then redirects with
// session tokens in the URL fragment instead of a PKCE code, parsed client-side by
// components/AuthConfirm.tsx (see lib/auth-hash.ts). This one-off client only ever sends the
// request — it never persists a session, so it needs none of the SSR client's cookie wiring.
export function signInWithOtpImplicit(email: string, emailRedirectTo: string) {
  const otpClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
  return otpClient.auth.signInWithOtp({ email, options: { emailRedirectTo } });
}
