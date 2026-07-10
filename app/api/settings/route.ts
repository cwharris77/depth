// Per-user settings API (Phase C, auth pass 1). Reads/writes the signed-in user's
// user_settings row (favorite + last-viewed team). RLS scopes every row to auth.uid(),
// so these handlers never filter by user id themselves — the server client's session
// does it. Signed out -> 401 (no anon persistence, by design: account-gated).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import type { UserSettings } from '@/lib/home-team';

const EMPTY: UserSettings = { favoriteTeamId: null, lastTeamId: null };

export async function GET() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data } = await supabase
    .from('user_settings')
    .select('favorite_team_id, last_team_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const settings: UserSettings = data
    ? { favoriteTeamId: data.favorite_team_id, lastTeamId: data.last_team_id }
    : EMPTY;
  return NextResponse.json(settings);
}

// Partial upsert: only the fields present in the body change. Sending { lastTeamId }
// leaves an existing favorite untouched; { favoriteTeamId } leaves last-viewed untouched.
export async function PUT(request: NextRequest) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: { favoriteTeamId?: string | null; lastTeamId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const patch: Database['public']['Tables']['user_settings']['Insert'] = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if ('favoriteTeamId' in body) patch.favorite_team_id = body.favoriteTeamId ?? null;
  if ('lastTeamId' in body) patch.last_team_id = body.lastTeamId ?? null;

  const { error } = await supabase.from('user_settings').upsert(patch, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'write failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
