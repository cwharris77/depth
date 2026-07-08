import { describe, it, expect } from "vitest";
import { generateCuratedSeedSql } from "../uniforms/seed-sql";
import { UNIFORMS } from "../uniforms/data";

// The generated seed migration must be source-guarded: it can only ever write/rewrite
// source='curated' rows, so a curated slug can never clobber a machine-owned espn home row.

describe("uniform seed generator", () => {
  const sql = generateCuratedSeedSql();

  it("guards the upsert with WHERE uniforms.source = 'curated'", () => {
    expect(sql).toContain("where uniforms.source = 'curated'");
  });

  it("marks every inserted row source='curated' (never espn)", () => {
    const curatedCount = (sql.match(/, 'curated', /g) ?? []).length;
    expect(curatedCount).toBe(UNIFORMS.length);
    expect(sql).not.toContain("'espn'");
  });

  it("emits one row per curated kit, keyed by `${teamId}-${slug}`", () => {
    for (const u of UNIFORMS) {
      expect(sql).toContain(`('${u.teamId}-${u.slug}', '${u.teamId}',`);
    }
  });
});
