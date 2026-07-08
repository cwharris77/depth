// Generates the baseline team-seed migration from the registry (lib/teams/league.ts) so a
// local `supabase db reset` has teams to reference before the FK-backed uniforms seed and
// the home-row backfill run. ON CONFLICT DO NOTHING makes it a no-op in a populated prod DB.
//
// Usage:
//   tsx scripts/gen-team-seed.mts supabase/migrations/<ts>_seed_teams.sql
//   tsx scripts/gen-team-seed.mts            # prints to stdout
//
// Re-run after changing the registry; commit the regenerated migration.

import { writeFileSync } from 'node:fs';
import { generateTeamSeedSql } from '../lib/teams/seed-sql';

const outPath = process.argv[2];
const sql = generateTeamSeedSql();
if (outPath) {
  writeFileSync(outPath, sql);
  // eslint-disable-next-line no-console
  console.log(`wrote team seed -> ${outPath}`);
} else {
  process.stdout.write(sql);
}
