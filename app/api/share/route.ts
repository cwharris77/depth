// Create-a-share API (Phase C, share pass). POST { teamId } -> the signed-in user's stable
// share slug for that team, minting one on first share and reusing it afterward so a link
// already in someone's hands keeps working (and keeps resolving to the owner's *live* order).
// The share is a reference, not a snapshot -- no override data is copied here. 401 signed out.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { newSlug } from '@/lib/slug';

export async function POST(request: NextRequest) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: { teamId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const { teamId } = body;
  if (typeof teamId !== 'string' || !teamId) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // Stable links: reuse the existing slug for this (user, team) if there is one.
  const existing = await supabase
    .from('shared_boards')
    .select('slug')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .maybeSingle();
  if (existing.data) return NextResponse.json({ slug: existing.data.slug });

  const ownerName = (user.email ?? '').split('@')[0] || 'someone';
  const slug = newSlug();
  const { error } = await supabase
    .from('shared_boards')
    .insert({ slug, user_id: user.id, team_id: teamId, owner_name: ownerName });

  if (error) {
    // Lost a race to a concurrent first-share (unique (user_id, team_id)) -- return the row
    // the other request created rather than surfacing a 500.
    const raced = await supabase
      .from('shared_boards')
      .select('slug')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .maybeSingle();
    if (raced.data) return NextResponse.json({ slug: raced.data.slug });
    return NextResponse.json({ error: 'write failed' }, { status: 500 });
  }

  return NextResponse.json({ slug });
}
