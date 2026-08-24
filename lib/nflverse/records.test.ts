import { describe, expect, it } from 'vitest';
import { toTeamRecords, type TeamAlignment } from './records';
import type { GameInsert } from './games';

// One `games` upsert row (the shape toScheduleAndGameRows emits). Defaults to a played
// NFC West divisional game so a test only has to state what it's actually exercising.
function game(over: Partial<GameInsert> = {}): GameInsert {
  return {
    game_id: '2025_01_SF_SEA',
    season: 2025,
    game_type: 'REG',
    week: 1,
    gameday: '2025-09-07',
    gametime: '13:00',
    home_team_id: 'seahawks',
    away_team_id: '49ers',
    home_score: 24,
    away_score: 17,
    location: null,
    away_moneyline: null,
    home_moneyline: null,
    spread_line: null,
    away_spread_odds: null,
    home_spread_odds: null,
    total_line: null,
    under_odds: null,
    over_odds: null,
    market_updated_at: null,
    ...over,
  };
}

const ALIGNMENTS = new Map<string, TeamAlignment>([
  ['seahawks', { conference: 'NFC', division: 'West' }],
  ['49ers', { conference: 'NFC', division: 'West' }],
  ['packers', { conference: 'NFC', division: 'North' }],
  ['bills', { conference: 'AFC', division: 'East' }],
]);

function seahawks(games: GameInsert[]) {
  const row = toTeamRecords(games, ALIGNMENTS).find((r) => r.team_id === 'seahawks');
  if (!row) throw new Error('expected a seahawks record');
  return row;
}

describe('toTeamRecords', () => {
  it('records one game from both teams’ perspectives', () => {
    const rows = toTeamRecords([game()], ALIGNMENTS);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.team_id === 'seahawks')).toMatchObject({
      season: 2025,
      overall_wins: 1,
      overall_losses: 0,
      points_for: 24,
      points_against: 17,
      point_differential: 7,
    });
    expect(rows.find((r) => r.team_id === '49ers')).toMatchObject({
      overall_wins: 0,
      overall_losses: 1,
      points_for: 17,
      points_against: 24,
      point_differential: -7,
    });
  });

  // DEP-200 regression. This is the whole reason the record moved off ESPN's standings
  // aggregate (DEP-146): ESPN reported preseason games as the season record through
  // August. A game row's explicit game_type makes the exclusion checkable.
  it('counts only REG games — never preseason or postseason', () => {
    const rows = toTeamRecords(
      [
        game({ game_id: 'pre', game_type: 'PRE', home_score: 7, away_score: 17 }),
        game({ game_id: 'wc', game_type: 'WC', home_score: 7, away_score: 17 }),
        game({ game_id: 'sb', game_type: 'SB', home_score: 7, away_score: 17 }),
      ],
      ALIGNMENTS
    );
    expect(rows).toEqual([]);
  });

  // The scheduled-but-unstarted season. Emitting a real 0-0 row (rather than nothing) is
  // what overwrites the stale preseason row the pre-DEP-146 ESPN ingest left behind, and
  // it matches what ESPN's regular-season standings themselves return before Week 1.
  it('emits a 0-0 row for a scheduled season with no games played yet', () => {
    const rows = toTeamRecords([game({ home_score: null, away_score: null })], ALIGNMENTS);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.team_id === 'seahawks')).toMatchObject({
      season: 2025,
      overall_wins: 0,
      overall_losses: 0,
      overall_ties: 0,
      win_percent: 0,
      points_for: 0,
      points_against: 0,
      point_differential: 0,
      streak: '',
    });
  });

  it('counts only the played games in a partially played season', () => {
    const row = seahawks([
      game({ game_id: 'played', gameday: '2025-09-07', home_score: 24, away_score: 17 }),
      game({ game_id: 'upcoming', gameday: '2025-09-14', home_score: null, away_score: null }),
    ]);
    expect(row).toMatchObject({
      overall_wins: 1,
      overall_losses: 0,
      points_for: 24,
      points_against: 17,
      streak: 'W1',
    });
  });

  it('splits home and road records', () => {
    const row = seahawks([
      game({
        game_id: 'h1',
        home_team_id: 'seahawks',
        away_team_id: '49ers',
        home_score: 24,
        away_score: 17,
      }),
      game({
        game_id: 'h2',
        home_team_id: 'seahawks',
        away_team_id: 'bills',
        home_score: 10,
        away_score: 20,
      }),
      game({
        game_id: 'r1',
        home_team_id: 'packers',
        away_team_id: 'seahawks',
        home_score: 3,
        away_score: 30,
      }),
    ]);
    expect(row).toMatchObject({
      home_wins: 1,
      home_losses: 1,
      road_wins: 1,
      road_losses: 0,
      overall_wins: 2,
      overall_losses: 1,
    });
  });

  it('nests division wins inside conference wins, and excludes cross-conference games', () => {
    const row = seahawks([
      // Divisional (NFC West) — counts toward both div and conf.
      game({ game_id: 'div', away_team_id: '49ers', home_score: 24, away_score: 17 }),
      // Same conference, different division — conf only.
      game({ game_id: 'conf', away_team_id: 'packers', home_score: 21, away_score: 14 }),
      // Cross-conference — neither.
      game({ game_id: 'inter', away_team_id: 'bills', home_score: 13, away_score: 10 }),
    ]);
    expect(row).toMatchObject({
      overall_wins: 3,
      division_wins: 1,
      division_losses: 0,
      conference_wins: 2,
      conference_losses: 0,
    });
  });

  it('counts a tie in the overall record but not in the W-L splits', () => {
    const row = seahawks([game({ home_score: 20, away_score: 20 })]);
    expect(row).toMatchObject({
      overall_wins: 0,
      overall_losses: 0,
      overall_ties: 1,
      home_wins: 0,
      home_losses: 0,
      division_wins: 0,
      division_losses: 0,
      conference_wins: 0,
      conference_losses: 0,
    });
  });

  // Matches ESPN's own winpercent for every 2022 tie team, so the re-own doesn't shift
  // the league-rank ordering this column feeds.
  it('counts a tie as half a win in win percentage', () => {
    const row = seahawks([
      game({ game_id: 'w', gameday: '2025-09-07', home_score: 24, away_score: 17 }),
      game({ game_id: 't', gameday: '2025-09-14', home_score: 20, away_score: 20 }),
    ]);
    expect(row.win_percent).toBeCloseTo(0.75, 7);
  });

  it('formats the current streak ESPN-style, most recent games first', () => {
    const row = seahawks([
      game({ game_id: 'l', gameday: '2025-09-07', home_score: 10, away_score: 20 }),
      game({ game_id: 'w1', gameday: '2025-09-14', home_score: 24, away_score: 17 }),
      game({ game_id: 'w2', gameday: '2025-09-21', home_score: 30, away_score: 3 }),
    ]);
    expect(row.streak).toBe('W2');
  });

  it('breaks a win streak on a tie', () => {
    const row = seahawks([
      game({ game_id: 'w1', gameday: '2025-09-07', home_score: 24, away_score: 17 }),
      game({ game_id: 'w2', gameday: '2025-09-14', home_score: 30, away_score: 3 }),
      game({ game_id: 't', gameday: '2025-09-21', home_score: 20, away_score: 20 }),
    ]);
    expect(row.streak).toBe('T1');
  });

  it('orders the streak by date, not by input order', () => {
    const row = seahawks([
      game({ game_id: 'w', gameday: '2025-09-21', home_score: 24, away_score: 17 }),
      game({ game_id: 'l', gameday: '2025-09-07', home_score: 10, away_score: 20 }),
    ]);
    expect(row.streak).toBe('W1');
  });

  it('still records a full overall line when a team’s alignment is unknown', () => {
    const rows = toTeamRecords([game({ away_team_id: 'jaguars' })], new Map());
    const row = rows.find((r) => r.team_id === 'seahawks');
    expect(row).toMatchObject({
      overall_wins: 1,
      home_wins: 1,
      points_for: 24,
      // No alignment to compare, so the div/conf split degrades to zero rather than
      // guessing the game was in-conference.
      division_wins: 0,
      conference_wins: 0,
    });
  });

  it('keeps seasons separate for the same team', () => {
    const rows = toTeamRecords(
      [
        game({ game_id: 'a', season: 2024, home_score: 24, away_score: 17 }),
        game({ game_id: 'b', season: 2025, home_score: 10, away_score: 20 }),
      ],
      ALIGNMENTS
    );
    const sea = rows.filter((r) => r.team_id === 'seahawks');
    expect(sea).toHaveLength(2);
    expect(sea.find((r) => r.season === 2024)).toMatchObject({
      overall_wins: 1,
      overall_losses: 0,
    });
    expect(sea.find((r) => r.season === 2025)).toMatchObject({
      overall_wins: 0,
      overall_losses: 1,
    });
  });

  it('returns a stable team-then-season order so reruns upsert the same batch', () => {
    const rows = toTeamRecords(
      [game({ game_id: 'b', season: 2025 }), game({ game_id: 'a', season: 2024 })],
      ALIGNMENTS
    );
    expect(rows.map((r) => `${r.team_id}|${r.season}`)).toEqual([
      '49ers|2024',
      '49ers|2025',
      'seahawks|2024',
      'seahawks|2025',
    ]);
  });

  it('returns nothing for no games', () => {
    expect(toTeamRecords([], ALIGNMENTS)).toEqual([]);
  });
});
