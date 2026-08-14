// Resolve-a-share API (Phase C, share pass). GET /api/shares/[slug] -> the referenced team,
// the owner's display name, and the owner's *current* override for that team (resolved live,
// so the link tracks the owner's edits). Public: anon reads the slug (shared_boards public
// read) and the owner's override rows are visible only because a shared_boards row references
// them (the scoped "shared overrides are public read" policy). 404 on an unknown slug.
// Named `shares` (not `boards`) -- the Phase D spec introduces /api/boards/* for saved boards.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { tables } from '@/lib/supabase/tables';
import type { TeamDepthOverride } from '@/lib/utils/depth-chart/depth-overrides';
import type { Position } from '@/lib/types';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getServerClient();

  const { data: board, error: boardError } = await supabase
    .from(tables.sharedBoards)
    .select('user_id, team_id, owner_name')
    .eq('slug', slug)
    .maybeSingle();
  if (boardError) return NextResponse.json({ error: 'read failed' }, { status: 500 });
  if (!board) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: rows, error: rowsError } = await supabase
    .from(tables.depthOverrides)
    .select('position, player_ids')
    .eq('user_id', board.user_id)
    .eq('team_id', board.team_id);
  if (rowsError) return NextResponse.json({ error: 'read failed' }, { status: 500 });

  const override: TeamDepthOverride = {};
  for (const row of rows ?? []) override[row.position as Position] = row.player_ids;

  return NextResponse.json({ teamId: board.team_id, ownerName: board.owner_name, override });
}
