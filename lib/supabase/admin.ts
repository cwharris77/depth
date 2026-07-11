// Service-role Supabase client, server-only. Bypasses RLS — the service role key must never
// reach the browser bundle, so only import this from route handlers, not client components.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export function getAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
