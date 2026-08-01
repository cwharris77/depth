// Monitors SportsLogos.net News' NFL category for new uniform unveilings so the
// append-only archive (lib/uniforms/data.ts) doesn't miss one. Run weekly (see
// .github/workflows/check-uniform-releases.yml), plus a manual trigger. Never part of
// `next build`.
//
// Fetches the NFL RSS feed, skips any item whose URL is already in
// uniform_release_watches (already seen), and records every new item there. Issue
// creation happens in the workflow step (`gh issue create`/actions/github-script), not
// here — this script only decides what's new and writes GITHUB_OUTPUT for it, keeping
// the dedupe write and the notification as separate concerns.
//
// Usage: npm run check:uniform-releases
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment (service role
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).

import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
import { parseSportsLogosFeed } from '../lib/sportslogos/parse';
import type { Database } from '../lib/database.types';

const NFL_FEED_URL = 'https://news.sportslogos.net/category/nfl/feed/';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// SportsLogos.net is a third-party site -- a fetch can blip like any other network call.
// Retry a few times with backoff rather than failing the whole run (same shape as
// ingest-espn.mts's getJson).
async function getText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

async function main() {
  const supabase: SupabaseClient<Database> = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  );

  const feedXml = await getText(NFL_FEED_URL);
  const items = parseSportsLogosFeed(feedXml);
  console.log(`Fetched ${items.length} item(s) from ${NFL_FEED_URL}`);

  const { data: watchedRows, error: watchedError } = await supabase
    .from('uniform_release_watches')
    .select('source_url');
  if (watchedError) {
    throw new Error(`uniform_release_watches query failed: ${watchedError.message}`);
  }
  const alreadySeen = new Set((watchedRows ?? []).map((r) => r.source_url));

  const newItems = items.filter((item) => !alreadySeen.has(item.url));

  if (newItems.length > 0) {
    const { error: insertError } = await supabase
      .from('uniform_release_watches')
      .insert(newItems.map((item) => ({ source_url: item.url, title: item.title })));
    if (insertError) {
      throw new Error(`failed to record uniform_release_watches: ${insertError.message}`);
    }
  }

  console.log(`${newItems.length} new item(s) not previously seen`);
  for (const item of newItems) console.log(`  ${item.title} -> ${item.url}`);

  // The workflow step reads this to loop over new items and open one GitHub issue per
  // item -- kept out of this script so the DB write (idempotency boundary) and the
  // notification (side effect) can't get out of sync with each other.
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    appendFileSync(outputPath, `new_items=${JSON.stringify(newItems)}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
