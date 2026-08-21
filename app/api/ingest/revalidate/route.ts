import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getIngestRevalidateSecret } from '@/lib/utils/env';

// Server-to-server endpoint the two ingest workflows (ingest-espn.yml, ingest-nflverse.yml)
// POST to as their last step on a successful run, so a fresh ingest doesn't wait out the
// `ingest` cacheLife profile's 6h `revalidate` window before the deployed app reflects it
// (2026-08-20-ingest-cache-revalidation-design.md). Every `'use cache'` read in
// lib/roster-source.db.ts that's sourced from ingest carries `cacheTag('ingest:espn')`
// and/or `cacheTag('ingest:nflverse')` — this route just calls `revalidateTag` for
// whichever tags the caller names, it has no opinion on which tags exist.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${getIngestRevalidateSecret()}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const tags = (body as { tags?: unknown })?.tags;
  if (!Array.isArray(tags) || tags.length === 0 || !tags.every((t) => typeof t === 'string')) {
    return NextResponse.json({ error: 'tags must be a non-empty string array' }, { status: 400 });
  }

  for (const tag of tags) {
    // Cache Components' revalidateTag needs the cacheLife profile the tagged entries
    // were created under (next.config.ts's 'ingest' profile) as its second argument --
    // every ingest:* tag here is only ever used inside a cacheLife('ingest') function.
    revalidateTag(tag, 'ingest');
  }
  return NextResponse.json({ revalidated: tags });
}
