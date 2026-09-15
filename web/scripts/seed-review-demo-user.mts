// Creates or resets the Apple App Review demo account (DEP-562). The app recognizes
// REVIEW_DEMO_EMAIL in Depth/Features/Auth/DepthAuthService.swift and signs in with the
// typed code used as this user's password instead of an emailed OTP — so the account must
// exist with REVIEW_DEMO_CODE as its password. Idempotent: safe to re-run, and the way to
// restore the account if a reviewer tests Delete Account and removes it.
//
// Usage: npm run seed:review-demo-user
// Requires SUPABASE_URL + SUPABASE_SECRET_KEY in the environment (secret key bypasses RLS;
// never expose it client-side).

import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/utils/env';

dotenv.config({ path: '.env.local' });

// Must match ReviewDemoAccount.email in Depth/Features/Auth/DepthAuthService.swift.
const REVIEW_DEMO_EMAIL = 'sticksdemo@cooper-harris.site';
// Must match the code in the App Store Connect review notes; keep the two in sync.
const REVIEW_DEMO_CODE = '123456';

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }
}

async function main() {
  const admin = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const existingId = await findUserIdByEmail(admin, REVIEW_DEMO_EMAIL);
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password: REVIEW_DEMO_CODE,
    });
    if (error) throw error;
    console.log(`reset ${REVIEW_DEMO_EMAIL} (${existingId})`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: REVIEW_DEMO_EMAIL,
    password: REVIEW_DEMO_CODE,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`created ${REVIEW_DEMO_EMAIL} (${data.user.id})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
