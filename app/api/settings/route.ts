// Per-user settings API (Phase C, auth pass 1). Reads/writes the signed-in user's
// user_settings row (favorite + last-viewed team). RLS scopes every row to auth.uid(),
// so these handlers never filter by user id themselves — the server client's session
// does it. Signed out -> 401 (no anon persistence, by design: account-gated).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, requireUser } from '@/lib/supabase/server';
import { tables } from '@/lib/supabase/tables';
import type { Database } from '@/lib/database.types';
import type { UserSettings } from '@/lib/home-team';

const EMPTY: UserSettings = { favoriteTeamId: null, lastTeamId: null, startOnFavorite: true };

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from(tables.userSettings)
    .select('favorite_team_id, last_team_id, start_on_favorite')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'read failed' }, { status: 500 });

  const settings: UserSettings = data
    ? {
        favoriteTeamId: data.favorite_team_id,
        lastTeamId: data.last_team_id,
        startOnFavorite: data.start_on_favorite,
      }
    : EMPTY;
  return NextResponse.json(settings);
}

// Partial upsert: only the fields present in the body change. Sending { lastTeamId }
// leaves an existing favorite untouched; { favoriteTeamId } leaves last-viewed untouched.
export async function PUT(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const supabase = await getServerClient();
  let body: {
    favoriteTeamId?: string | null;
    lastTeamId?: string | null;
    startOnFavorite?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const patch: Database['public']['Tables']['user_settings']['Insert'] = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if ('favoriteTeamId' in body) {
    const value = body.favoriteTeamId;
    if (value !== null && typeof value !== 'string') {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    patch.favorite_team_id = value;
  }
  if ('lastTeamId' in body) {
    const value = body.lastTeamId;
    if (value !== null && typeof value !== 'string') {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    patch.last_team_id = value;
  }
  if ('startOnFavorite' in body) {
    const value = body.startOnFavorite;
    if (typeof value !== 'boolean') {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    patch.start_on_favorite = value;
  }

  const { error } = await supabase
    .from(tables.userSettings)
    .upsert(patch, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'write failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
