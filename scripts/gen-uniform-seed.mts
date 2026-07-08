// Generates an append-only SQL seed migration from the hand-curated archive
// (lib/uniforms/data.ts). Replaces the old `ingest:uniforms` runtime upsert: curated kits
// now ship as committed migrations the Supabase pipeline applies on merge — no manual script
// against prod, no hand-edited tables. The generation logic lives in lib/uniforms/seed-sql
// (so it's unit-testable); this is the CLI around it.
//
// Usage:
//   tsx scripts/gen-uniform-seed.mts supabase/migrations/<ts>_seed_curated_uniforms.sql
//   tsx scripts/gen-uniform-seed.mts            # prints to stdout
//
// Re-run after editing data.ts; commit the new migration.

import { writeFileSync } from "node:fs";
import { generateCuratedSeedSql } from "../lib/uniforms/seed-sql";
import { UNIFORMS } from "../lib/uniforms/data";

const outPath = process.argv[2];
const sql = generateCuratedSeedSql();
if (outPath) {
  writeFileSync(outPath, sql);
  // eslint-disable-next-line no-console
  console.log(`wrote ${UNIFORMS.length} curated rows -> ${outPath}`);
} else {
  process.stdout.write(sql);
}
