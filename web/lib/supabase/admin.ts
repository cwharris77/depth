// Secret-key Supabase client, server-only. Bypasses RLS — the secret key must never
// reach the browser bundle, so only import this from route handlers, not client components.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/utils/env';

export function getAdminClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
