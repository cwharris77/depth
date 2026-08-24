import { describe, it, expect } from 'vitest';
import { generateCuratedSeedSql } from '@/lib/uniforms/seed-sql';
import { uniformArtURL } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';

// The generated seed owns every uniform row. Stable IDs include the kit's start year so a
// later retirement changes dates/current-ness without renaming the row.

describe('uniform seed generator', () => {
  const sql = generateCuratedSeedSql();

  it('does not emit the removed source column', () => {
    expect(sql).not.toMatch(/\bsource\b/);
  });

  it('emits one row per curated kit, keyed by `${teamId}-${slug}-${yearStart}`', () => {
    for (const u of UNIFORMS) {
      expect(sql).toContain(`('${u.teamId}-${u.slug}-${u.yearStart}', '${u.teamId}',`);
    }
  });

  it("derives every row's image_path from its id (DEP-220 artifact URL)", () => {
    for (const u of UNIFORMS) {
      expect(sql).toContain(uniformArtURL(`${u.teamId}-${u.slug}-${u.yearStart}`));
    }
    // Every curated row must carry the URL; a NULL image_path would leave the picker
    // without a thumbnail for a kit whose WebP is always generated.
    const urls = (sql.match(/https:\/\/depth-ashen\.vercel\.app\/uniforms\//g) ?? []).length;
    expect(urls).toBe(UNIFORMS.length);
  });
});
