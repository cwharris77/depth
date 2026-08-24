import { describe, it, expect } from 'vitest';
import { buildSeedSql } from './seed-sql';
import type { Coach } from './transform';
import type { TeamRoster, TeamStats, Player, SpecialSlot } from '../types';

// sqlValue/insertStatement tests live in lib/seed-sql.test.ts (shared implementation);
// this file covers buildSeedSql's ESPN-specific row-shaping only.

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

function coach(over: Partial<Coach> = {}): Coach {
  return { name: 'Mike Macdonald', espnId: '5044374', experience: 2, ...over };
}

function stats(over: Partial<TeamStats> = {}): TeamStats {
  return {
    season: 2025,
    overallWins: 14,
    overallLosses: 3,
    overallTies: 0,
    winPercent: 0.824,
    homeWins: 6,
    homeLosses: 3,
    roadWins: 8,
    roadLosses: 0,
    divisionWins: 5,
    divisionLosses: 1,
    conferenceWins: 9,
    conferenceLosses: 3,
    pointsFor: 490,
    pointsAgainst: 320,
    pointDifferential: 170,
    streak: 'W3',
    playoffSeed: 2,
    ...over,
  };
}

describe('buildSeedSql', () => {
  it('emits teams, brand colors, players, depth, special-teams, and team_stats in FK order', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: coach(), stats: [stats()] }]);
    const iTeams = sql.indexOf('insert into teams');
    const iBrandColors = sql.indexOf('insert into brand_colors');
    const iPlayers = sql.indexOf('insert into players');
    const iDepth = sql.indexOf('insert into depth_chart_entries');
    const iSpecial = sql.indexOf('insert into special_teams_slots');
    const iStats = sql.indexOf('insert into team_stats');
    expect(iTeams).toBeGreaterThanOrEqual(0);
    expect(iTeams).toBeLessThan(iBrandColors);
    expect(iBrandColors).toBeLessThan(iPlayers);
    expect(iPlayers).toBeLessThan(iDepth);
    expect(iDepth).toBeLessThan(iSpecial);
    expect(iSpecial).toBeLessThan(iStats);
  });

  it('stores ESPN colors only in brand_colors', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: coach(), stats: [] }]);
    const teamsBlock = sql.slice(
      sql.indexOf('insert into teams'),
      sql.indexOf('insert into brand_colors')
    );
    const brandBlock = sql.slice(
      sql.indexOf('insert into brand_colors'),
      sql.indexOf('insert into players')
    );

    expect(teamsBlock).not.toContain('color_primary');
    expect(brandBlock).toContain('color_primary');
    expect(brandBlock).toContain("'#001'");
  });

  it('writes coach_name/coach_experience onto the teams row', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: coach(), stats: [stats()] }]);
    expect(sql).toContain("'Mike Macdonald'");
  });

  it('omits coach columns as null when coach is null', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: null, stats: [stats()] }]);
    const teamsBlock = sql.slice(
      sql.indexOf('insert into teams'),
      sql.indexOf('insert into players')
    );
    expect(teamsBlock).toContain('null');
  });

  it('skips the team_stats insert when stats is empty', () => {
    const sql = buildSeedSql([{ roster: roster(), coach: coach(), stats: [] }]);
    expect(sql).not.toContain('insert into team_stats');
  });

  it('prefixes special-teams slot ids with the team id', () => {
    expect(buildSeedSql([{ roster: roster(), coach: null, stats: [] }])).toContain(
      "('sea-kr', 'sea'"
    );
  });

  it('does not emit updated_at (column default fills it, no diff churn)', () => {
    expect(buildSeedSql([{ roster: roster(), coach: null, stats: [] }])).not.toContain(
      'updated_at'
    );
  });

  it('skips a table with no rows', () => {
    const sql = buildSeedSql([{ roster: roster({ specialTeams: [] }), coach: null, stats: [] }]);
    expect(sql).not.toContain('insert into special_teams_slots');
  });

  it('gates team_stats per-entry: one with stats, one without, both teams emitted', () => {
    const seaRoster = roster();
    const sfRoster = roster({
      team: { ...roster().team, id: 'sf', abbrev: 'SF' },
    });
    const sql = buildSeedSql([
      { roster: seaRoster, coach: coach(), stats: [stats()] },
      { roster: sfRoster, coach: null, stats: [] },
    ]);

    // team_stats insert block is present
    expect(sql).toContain('insert into team_stats');

    // Both teams appear in the teams insert block
    const teamsBlock = sql.slice(
      sql.indexOf('insert into teams'),
      sql.indexOf('insert into players')
    );
    expect(teamsBlock).toContain("'sea'");
    expect(teamsBlock).toContain("'sf'");

    // team_stats block contains only the sea team (which has stats), not sf
    const teamStatsBlock = sql.slice(sql.indexOf('insert into team_stats'));
    expect(teamStatsBlock).toContain("'sea'");
    expect(teamStatsBlock).not.toContain("'sf'");
  });
});
