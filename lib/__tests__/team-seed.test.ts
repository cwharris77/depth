import { describe, expect, it } from 'vitest';
import { LEAGUE } from '../teams/league';
import { generateTeamSeedSql } from '../teams/seed-sql';

describe('team seed generator', () => {
  const sql = generateTeamSeedSql();

  it('emits insert statements for every league team', () => {
    for (const roster of LEAGUE) {
      expect(sql).toContain(`('${roster.team.id}',`);
    }
  });

  it('never clobbers a populated (prod) teams table', () => {
    expect(sql).toContain('insert into teams');
    // DO NOTHING, not DO UPDATE: prod colors come from the live ESPN ingest and must not be
    // overwritten when this baseline seed re-applies.
    expect(sql).toContain('on conflict (id) do nothing');
    expect(sql).not.toContain('do update');
  });

  it('populates conference and division so the seed fits the non-null schema', () => {
    expect(sql).toContain("'bills', 'BUF', 'Buffalo', 'Bills', 'AFC', 'East'");
    expect(sql).toContain("'seahawks', 'SEA', 'Seattle', 'Seahawks', 'NFC', 'West'");
  });

  it('emits real registry colors so local dev renders without the ESPN ingest', () => {
    expect(sql).toContain(
      "'seahawks', 'SEA', 'Seattle', 'Seahawks', 'NFC', 'West', '#002244', '#69BE28'"
    );
    expect(sql).not.toContain('NULL');
  });
});
