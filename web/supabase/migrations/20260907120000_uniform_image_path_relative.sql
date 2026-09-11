-- DEP-406: uniforms.image_path moves from an absolute production origin to an
-- origin-relative path. Web art resolves against the current request origin
-- (lib/uniforms/art.tsx), so a relative path makes local dev and Vercel preview serve
-- their own public/uniforms/ rasters instead of round-tripping to production — the
-- pre-deploy verification blind spot that forced the helmet-art migration to substitute
-- direct raster inspection for a browser check (depth#717). Relative paths also mean no
-- future host migration ever touches this column again. iOS never reads image_path (it
-- renders from the compiled UniformArt.baseURL), so the rewrite is web-only.
--
-- Scoped to rows carrying the old generated origin; anything else (a hand-set or
-- already-relative path) is left untouched to be surfaced in review rather than
-- blanket-rewritten. No schema change, so no generated-type regeneration is needed.
update uniforms
set image_path = substring(image_path from '/uniforms/[^ ]*$'),
    updated_at = now()
where image_path like 'https://depth-ashen.vercel.app/uniforms/%';