import { describe, it, expect } from 'vitest';
import { generateCuratedSeedSql } from '@/lib/uniforms/seed-sql';
import { uniformArtURL } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';
import { LEGACY_ACCENTS } from '@/lib/uniforms/legacy-accents';

// The generated seed owns every uniform row. Stable IDs include the kit's start year so a
// later retirement changes dates/current-ness without renaming the row.

describe('uniform seed generator', () => {
  const sql = generateCuratedSeedSql();

  // ui_accent/on_accent are no longer on the archive rows — they come from the frozen
  // legacy map. Every emitted row must still carry its exact pair, because already-installed
  // iOS builds select those columns and decode them into non-optional Strings.
  it('emits each row with its frozen legacy accent pair', () => {
    for (const u of UNIFORMS) {
      const id = `${u.teamId}-${u.slug}-${u.yearStart}`;
      const pair = LEGACY_ACCENTS[id];
      const row = sql.split('\n').find((line) => line.includes(`('${id}',`));
      expect(row, `no emitted row for ${id}`).toBeDefined();
      expect(row).toContain(`'${pair.uiAccent}'`);
      expect(row).toContain(`'${pair.onAccent}'`);
    }
  });

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
