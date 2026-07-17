// Browser Supabase client for auth (Phase C, auth pass 1; OTP-code sign-in, auth pass 3).
// The app's data reads still go through dbRosterSource with the server-side anon key; this
// client exists only so the browser can run the code sign-in flow and observe auth state.
// Singleton — one client per tab keeps a single auth/session listener and cookie writer.
import { createBrowserClient } from '@supabase/ssr';
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
