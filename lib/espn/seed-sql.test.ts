import { describe, it, expect } from 'vitest';
import { sqlValue, insertStatement, buildSeedSql } from './seed-sql';
import type { TeamRoster, Player, SpecialSlot } from '../types';

describe('sqlValue', () => {
  it("escapes single quotes in strings (O'Brien)", () => {
    expect(sqlValue("O'Brien")).toBe("'O''Brien'");
  });
  it('renders null and undefined as SQL null', () => {
    expect(sqlValue(null)).toBe('null');
    expect(sqlValue(undefined)).toBe('null');
  });
  it('renders numbers and booleans bare', () => {
    expect(sqlValue(42)).toBe('42');
    expect(sqlValue(true)).toBe('true');
  });
  it('renders a non-finite number as null (never NaN in SQL)', () => {
    expect(sqlValue(NaN)).toBe('null');
  });
});

describe('insertStatement', () => {
  it('returns empty string for no rows (no dangling INSERT)', () => {
    expect(insertStatement('players', ['id'], [], 'id')).toBe('');
  });
  it('emits a multi-row on-conflict-do-nothing insert', () => {
    const sql = insertStatement(
      'teams',
      ['id', 'name'],
      [
        { id: 'sea', name: 'Seahawks' },
        { id: 'sf', name: ' 49ers' },
      ],
      'id'
    );
    expect(sql).toContain('insert into teams (id, name) values');
    expect(sql).toContain("('sea', 'Seahawks')");
    expect(sql).toContain('on conflict (id) do nothing;');
  });
});

function player(over: Partial<Player>): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    number: 1,
    position: 'QB',
    depthRank: 1,
    order: 0,
    status: 'starter',
    age: 25,
    college: 'State',
    experience: 3,
    height: '6\'2"',
    weight: 220,
    bio: 'bio',
    photoUrl: null,
    ...over,
  } as Player;
}

function roster(over: Partial<TeamRoster> = {}): TeamRoster {
  const special: SpecialSlot = { id: 'kr', playerId: 'p1', x: 50, y: 50, label: 'KR' };
  return {
    team: {
      id: 'sea',
      abbrev: 'SEA',
      city: 'Seattle',
      name: 'Seahawks',
      conference: 'NFC',
      division: 'West',
      colors: {
        primary: '#001',
        secondary: '#69BE28',
        accent: '#A5A',
        uiAccent: '#69BE28',
        onAccent: '#000',
      },
      logo: null,
      logoDark: null,
    },
    players: [player({})],
    specialTeams: [special],
    ...over,
  } as TeamRoster;
}

describe('buildSeedSql', () => {
  it('emits teams, players, depth, and special-teams inserts in FK order', () => {
    const sql = buildSeedSql([roster()]);
    const iTeams = sql.indexOf('insert into teams');
    const iPlayers = sql.indexOf('insert into players');
    const iDepth = sql.indexOf('insert into depth_chart_entries');
    const iSpecial = sql.indexOf('insert into special_teams_slots');
    expect(iTeams).toBeGreaterThanOrEqual(0);
    expect(iTeams).toBeLessThan(iPlayers);
    expect(iPlayers).toBeLessThan(iDepth);
    expect(iDepth).toBeLessThan(iSpecial);
  });

  it('prefixes special-teams slot ids with the team id', () => {
    expect(buildSeedSql([roster()])).toContain("('sea-kr', 'sea'");
  });

  it('does not emit updated_at (column default fills it, no diff churn)', () => {
    expect(buildSeedSql([roster()])).not.toContain('updated_at');
  });

  it('skips a table with no rows', () => {
    const sql = buildSeedSql([roster({ specialTeams: [] })]);
    expect(sql).not.toContain('insert into special_teams_slots');
  });
});
