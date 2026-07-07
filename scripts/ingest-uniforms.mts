// Upserts the hand-curated uniform archive (lib/uniforms/data.ts) into Postgres.
// Unlike ingest-espn, this NEVER fetches anything external — no structured uniform
// source exists (see Data Sources.md in the vault), so the committed seed file is the
// source of truth and this script only moves it into the DB. Append-only: it upserts by
// id and never deletes, so retired kits stay in the archive.
//
// Usage: npm run ingest:uniforms
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS for
// writes; never expose it client-side). Not part of `next build`.
//
// uniforms.team_id references teams(id), so a team must already be ingested (run
// ingest:espn first). A row whose team isn't present yet is reported as an error and
// skipped, not fatal — rerun after the team lands.

import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
import { UNIFORMS } from '../lib/uniforms/data';
import type { Database } from '../lib/database.types';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient(supabaseUrl, serviceRoleKey);

  const startedAt = new Date().toISOString();
  const errors: { uniform: string; message: string }[] = [];
  let written = 0;

  // Upsert one row at a time so a single bad row (e.g. a not-yet-ingested team) is
  // isolated and reported instead of failing the whole batch.
  for (const u of UNIFORMS) {
    const id = `${u.teamId}-${u.slug}`;
    const { error } = await supabase.from('uniforms').upsert(
      {
        id,
        team_id: u.teamId,
        name: u.name,
        year_start: u.yearStart,
        year_end: u.yearEnd,
        is_current: u.isCurrent,
        color_primary: u.colors.primary,
        color_secondary: u.colors.secondary,
        color_accent: u.colors.accent,
        ui_accent: u.colors.uiAccent,
        on_accent: u.colors.onAccent,
        image_path: u.imagePath ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      errors.push({ uniform: id, message: error.message });
      continue;
    }
    written++;
    // eslint-disable-next-line no-console
    console.log(`upserted ${id}`);
  }

  const finishedAt = new Date().toISOString();
  const status = errors.length === 0 ? 'success' : written > 0 ? 'partial' : 'failure';

  const { error: runError } = await supabase.from('ingestion_runs').insert({
    source: 'uniforms',
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    teams_written: written,
    errors: errors.length ? errors : null,
  });
  if (runError) throw new Error(`failed to record ingestion_runs: ${runError.message}`);

  console.log(`\nWrote ${written} uniforms. Status: ${status}`);
  if (errors.length) {
    console.log('Errors/skips:');
    for (const e of errors) console.log(`  ${e.uniform}: ${e.message}`);
  }
  if (status === 'failure') process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
