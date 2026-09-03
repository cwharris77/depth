// Monitors SportsLogos.net News' NFL category for new uniform unveilings so the
// append-only archive (lib/uniforms/data.ts) doesn't miss one. Run monthly (see
// .github/workflows/check-uniform-releases.yml), plus a manual trigger. Never part of
// `next build`.
//
// Fetches the NFL RSS feed, skips any item whose URL is already in
// uniform_release_watches (already seen), and records every new item there. Dedupe covers
// EVERY new item; notification covers only the ones lib/sportslogos/classify.ts judges to
// be actual unveilings — the feed is a general NFL-news category, so recording everything
// keeps the dedupe complete while the filter keeps listicles, Madden coverage, headwear
// drops and leaks out of the notification.
//
// Notification writes a dated one-liner per unveiling into the Obsidian vault's
// System/Inbox.md, where inbox-triage/capture-ticket turns each into a depth ticket
// grouped under a run-month epic. This replaces the GitHub issue per item that DEP-43
// originally specified (reversed 2026-09-03 — see the vault's Projects/depth/Decisions.md:
// the issues were unfiltered noise and lived outside the board Cooper actually triages).
//
// Usage: npm run check:uniform-releases
// Requires SUPABASE_URL + SUPABASE_SECRET_KEY in the environment (secret key
// bypasses RLS-equivalent restrictions for writes; never expose it client-side).
// OBSIDIAN_VAULT_PATH points at the vault working copy; when it is unset the script still
// runs and records dedupe state, printing what it would have filed instead of writing.

import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/utils/env';

dotenv.config({ path: '.env.local' });
import { parseSportsLogosFeed } from '@/lib/sportslogos/parse';
import { classifyNewsItem } from '@/lib/sportslogos/classify';
import { formatInboxLine, insertUnsortedLines } from '@/lib/sportslogos/inbox';
import type { Database } from '@/lib/database.types';

const NFL_FEED_URL = 'https://news.sportslogos.net/category/nfl/feed/';

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
  const supabase: SupabaseClient<Database> = createClient(getSupabaseUrl(), getSupabaseSecretKey());

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

  const unveilings: typeof newItems = [];
  for (const item of newItems) {
    const verdict = classifyNewsItem(item.title);
    if (verdict.isUnveiling) {
      unveilings.push(item);
      console.log(`  [unveiling] ${item.title}`);
    } else {
      console.log(`  [skip: ${verdict.reason}] ${item.title}`);
    }
  }
  console.log(`${unveilings.length} of them are uniform unveilings worth filing`);

  if (unveilings.length > 0) fileToVaultInbox(unveilings);
}

// Appends one line per unveiling under System/Inbox.md's `## Unsorted` heading. Read →
// insert → write rather than a blind append: the heading is the anchor, and a note whose
// shape has changed underneath us degrades to "print, don't write" so the monitor can
// never corrupt the inbox.
function fileToVaultInbox(unveilings: readonly { title: string; url: string }[]) {
  const lines = unveilings.map((item) => formatInboxLine(item, new Date()));

  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) {
    console.log('OBSIDIAN_VAULT_PATH unset — would have filed:');
    for (const line of lines) console.log(`  ${line}`);
    return;
  }

  const inboxPath = join(vaultPath, 'System', 'Inbox.md');
  const updated = insertUnsortedLines(readFileSync(inboxPath, 'utf8'), lines);
  if (updated === null) {
    console.error(`No "## Unsorted" heading in ${inboxPath} — not writing. Would have filed:`);
    for (const line of lines) console.error(`  ${line}`);
    return;
  }

  writeFileSync(inboxPath, updated);
  console.log(`Filed ${lines.length} item(s) into ${inboxPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
