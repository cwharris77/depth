import { describe, it, expect } from 'vitest';
import { generateCuratedSeedSql } from '@/lib/uniforms/seed-sql';
import { uniformArtURL } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';

// The generated seed migration must be source-guarded: it can only ever write/rewrite
// source='curated' rows, so a curated slug can never clobber a machine-owned espn home row.

describe('uniform seed generator', () => {
  const sql = generateCuratedSeedSql();

  it("guards the upsert with WHERE uniforms.source = 'curated'", () => {
    expect(sql).toContain("where uniforms.source = 'curated'");
  });

  it("marks every inserted row source='curated' (never espn)", () => {
    const curatedCount = (sql.match(/, 'curated', /g) ?? []).length;
    expect(curatedCount).toBe(UNIFORMS.length);
    expect(sql).not.toContain("'espn'");
  });

  it('emits one row per curated kit, keyed by `${teamId}-${slug}`', () => {
    for (const u of UNIFORMS) {
      expect(sql).toContain(`('${u.teamId}-${u.slug}', '${u.teamId}',`);
    }
  });

  it("derives every row's image_path from its id (DEP-220 artifact URL)", () => {
    for (const u of UNIFORMS) {
      expect(sql).toContain(uniformArtURL(`${u.teamId}-${u.slug}`));
    }
    // Every curated row must carry the URL; a NULL image_path would leave the picker
    // without a thumbnail for a kit whose WebP is always generated.
    const urls = (sql.match(/https:\/\/depth-ashen\.vercel\.app\/uniforms\//g) ?? []).length;
    expect(urls).toBe(UNIFORMS.length);
  });
});
