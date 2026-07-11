// Custom depth-chart override API (Phase C, override-sync pass). Reads/writes the signed-in
// user's depth_overrides rows so a custom order is durable and cross-device. RLS scopes every
// row to auth.uid(), so the session (not these handlers) is the security boundary; the
// explicit user_id filters below are for clarity and to key the wholesale replace. Signed out
// -> 401 (no anon persistence, by design: account-gated).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import type { Position } from '@/lib/types';

// GET -> the user's overrides shaped as Record<teamId, TeamDepthOverride> (position -> ids),
// exactly the shape lib/depth-overrides and the field render from.
export async function GET() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('depth_overrides')
    .select('team_id, position, player_ids')
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'read failed' }, { status: 500 });

  const overrides: Record<string, TeamDepthOverride> = {};
  for (const row of data ?? []) {
    const team = (overrides[row.team_id] ??= {});
    team[row.position as Position] = row.player_ids;
  }
  return NextResponse.json(overrides);
}

// PUT { teamId, override } -> replace that team's overlay wholesale: clear the old rows, then
// insert the current positions (empty override = just clear). Not one SQL transaction
// (supabase-js has no multi-statement txn), but safe: a crash between delete and insert leaves
// the team with no override (reverts to default), which the next write heals. Last-write-wins,
// matching the fire-and-forget client. 401 signed out.
export async function PUT(request: NextRequest) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: { teamId?: unknown; override?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { teamId, override } = body;
  if (typeof teamId !== 'string' || typeof override !== 'object' || override === null) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const del = await supabase
    .from('depth_overrides')
    .delete()
    .eq('user_id', user.id)
    .eq('team_id', teamId);
  if (del.error) return NextResponse.json({ error: 'write failed' }, { status: 500 });

  // Only positions with a non-empty id list become rows; anything malformed is dropped.
  const rows: Database['public']['Tables']['depth_overrides']['Insert'][] = Object.entries(
    override as Record<string, unknown>
  )
    .filter(([, ids]) => Array.isArray(ids) && ids.length > 0)
    .map(([position, ids]) => ({
      user_id: user.id,
      team_id: teamId,
      position,
      player_ids: (ids as unknown[]).filter((id): id is string => typeof id === 'string'),
      updated_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const ins = await supabase.from('depth_overrides').insert(rows);
    if (ins.error) return NextResponse.json({ error: 'write failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
