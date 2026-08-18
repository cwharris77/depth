// Generates the prerendered uniform thumbnails for the native iOS picker (DEP-220) from
// the exact rows that picker renders. The hosted `uniforms` table is the authoritative
// source when credentials exist: it covers every row kind uniformly — `source='espn'`
// home rows, `source='curated'` kits, and reconcile-retired `-home-<year>` snapshots —
// all with the DB's real kit colors. Without credentials it falls back to the committed
// in-repo sources (scripts/gen-uniform-seed.mts's data.ts + lib/teams/league.ts), which
// cover every currently-seeded row; the fallback matches the web's own "home colors come
// from teams, kits come from the archive" split, so the only divergence is a home kit
// whose colors moved since the last committed snapshot (regenerate against the DB at
// release to pin).
//
// Outputs: `public/uniforms/<id>.webp` per row (the id IS the `<teamId>-<slug>` slug),
// deterministically rendered from the shared UniformFigure jersey crop (the same SVG the
// web picker's JerseySwatch fallback renders) and rasterized with sharp. Committed to the
// repo like the `gen:icons` rasters and served at UNIFORM_ART_BASE_URL; the DB's
// `uniforms.image_path` column points each row at its artifact (see the backfill
// migration and lib/uniforms/seed-sql.ts).
//
// Usage: npm run gen:uniform-thumbs
// Requires SUPABASE_URL + SUPABASE_SECRET_KEY to regenerate from live rows (reads only);
// runs without them from the committed seed sources. Pure rendering lives in
// lib/uniforms/art.tsx — this script is I/O glue.
import dotenv from 'dotenv';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { renderUniformThumbSVG } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/utils/env';
import { LEAGUE } from '@/lib/teams/league';
import type { TeamColors } from '@/lib/types';

dotenv.config({ path: '.env.local' });

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'uniforms');
// The two raster variants each kit is committed as: the jersey crop the picker rows use,
// and the full mannequin (helmet -> cleats) the uniform archive uses. The archive's
// figure is `variant="full"`, so pointing it at the square jersey crop stretches it —
// the -full raster is the fix for that (see components/UniformArchive.tsx).
const VARIANTS = {
  jersey: { suffix: '', variant: 'jersey' as const },
  full: { suffix: '-full', variant: 'full' as const },
} as const;

type UniformRow = {
  id: string;
  team_id: string;
  colors: TeamColors;
};

// Live-rows mode: every `uniforms` row with the colors the picker reads.
async function buildRowsFromDb(): Promise<UniformRow[]> {
  const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey());
  const { data, error } = await supabase
    .from('uniforms')
    .select('id, team_id, color_primary, color_secondary, color_accent, ui_accent, on_accent')
    .order('id')
    .returns<
      {
        id: string;
        team_id: string;
        color_primary: string;
        color_secondary: string;
        color_accent: string;
        ui_accent: string;
        on_accent: string;
      }[]
    >();
  if (error) throw new Error(`uniforms read failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('uniforms read returned no rows');
  return data.map((row) => ({
    id: row.id,
    team_id: row.team_id,
    colors: {
      primary: row.color_primary,
      secondary: row.color_secondary,
      accent: row.color_accent,
      uiAccent: row.ui_accent,
      onAccent: row.on_accent,
    },
  }));
}

// Seed mode (no credentials): curated kits from the committed archive (the same rows the
// seed migrations emit) plus one `${team}-home` row per team from league.ts's identity
// colors. Cannot reproduce reconcile-retired `-home-<year>` snapshots — those only come
// from the live rows.
function buildRowsFromSeed(): UniformRow[] {
  const rows: UniformRow[] = [];
  for (const kit of UNIFORMS) {
    rows.push({ id: `${kit.teamId}-${kit.slug}`, team_id: kit.teamId, colors: kit.colors });
  }
  for (const roster of LEAGUE) {
    rows.push({
      id: `${roster.team.id}-home`,
      team_id: roster.team.id,
      colors: roster.team.colors,
    });
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

async function writeRows(rows: UniformRow[]) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const row of rows) {
    for (const { suffix, variant } of Object.values(VARIANTS)) {
      const svg = renderUniformThumbSVG(
        row.colors,
        row.id,
        getTeamUniformDefinition(row.team_id),
        variant
      );
      const outPath = join(OUT_DIR, `${row.id}${suffix}.webp`);
      await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(outPath);
      console.log(`wrote ${outPath}`);
    }
  }
  console.log(`\n${rows.length} uniform rasters (jersey + full) -> ${OUT_DIR}`);
}

async function main() {
  const hasCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  if (hasCreds) {
    const rows = await buildRowsFromDb();
    await writeRows(rows);
  } else {
    console.warn(
      'SUPABASE_URL/SUPABASE_SECRET_KEY not set — generating from the committed seed ' +
        '(see the script header for what that covers). Set both to regenerate from live rows.'
    );
    await writeRows(buildRowsFromSeed());
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
