-- DEP-220: point every uniform row at its prerendered WebP artifact. Artifacts are
-- generated from the same colors the picker renders (scripts/gen-uniform-thumbs.mts) and
-- committed under public/uniforms/, served at https://depth-ashen.vercel.app/uniforms/.
-- Covers every row kind: espn home rows, curated kits (whose future reseeds already carry
-- the derived URL via lib/uniforms/seed-sql.ts), and reconcile-retired -home-<year>
-- snapshots. Idempotent: rows that already have an image_path are left untouched. No
-- schema change, so no generated-type regeneration is needed.
update uniforms
set image_path = 'https://depth-ashen.vercel.app/uniforms/' || id || '.webp',
    updated_at = now()
where image_path is null;