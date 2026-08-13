// Account deletion (Phase C, P0 App Store requirement). Deletes the auth.users row via the
// service-role admin client; user_settings, depth_overrides, and shared_boards all have
// `on delete cascade` FKs to auth.users (see supabase/migrations), so no per-table cleanup
// is needed here.
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'read failed' }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  try {
    const { error } = await getAdminClient().auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
