// Resolve-a-share API (Phase C, share pass). GET /api/shares/[slug] -> the referenced team,
// the owner's display name, and the owner's *current* override for that team (resolved live,
// so the link tracks the owner's edits). Public: anon reads the slug (shared_boards public
// read) and the owner's override rows are visible only because a shared_boards row references
// them (the scoped "shared overrides are public read" policy). 404 on an unknown slug.
// Named `shares` (not `boards`) -- the Phase D spec introduces /api/boards/* for saved boards.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import type { Position } from '@/lib/types';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getServerClient();

  const { data: board } = await supabase
    .from('shared_boards')
    .select('user_id, team_id, owner_name')
    .eq('slug', slug)
    .maybeSingle();
  if (!board) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: rows } = await supabase
    .from('depth_overrides')
    .select('position, player_ids')
    .eq('user_id', board.user_id)
    .eq('team_id', board.team_id);

  const override: TeamDepthOverride = {};
  for (const row of rows ?? []) override[row.position as Position] = row.player_ids;

  return NextResponse.json({ teamId: board.team_id, ownerName: board.owner_name, override });
}
