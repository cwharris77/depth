import { describe, it, expect } from 'vitest';
import { lineYardsFor, toTeamLineStatsRows, type TeamLineStatsInsert } from './line-metrics';

const resolve: (code: string) => string | null = (code) => {
  if (code === 'AAA') return 'team-a';
  if (code === 'BBB') return 'team-b';
  return null;
};

// Hand-computed fixture. Every expected value below is derived by walking the play list
// by hand against the Football Outsiders weights (losses 120%, 0-4 100%, 5-10 50%, 11+ 0%).
const GAMES = new Map([
  ['team-a', 4],
  ['team-b', 4],
]);

function play(overrides: Record<string, string>): Record<string, string> {
  return { game_id: 'g1', season_type: 'REG', posteam: 'AAA', ...overrides };
}

const FIXTURE: Record<string, string>[] = [
  // --- Team A rushes: line yards 3, -2.4, 3.5, 0, 0 => 4.1 over 5 carries => 0.82
  play({ game_id: 'g1', rush_attempt: '1', yards_gained: '3' }),
  play({ game_id: 'g1', rush_attempt: '1', yards_gained: '-2' }),
  play({
    game_id: 'g2',
    rush_attempt: '1',
    yards_gained: '7',
    down: '3',
    ydstogo: '2',
    first_down: '1',
  }),
  play({ game_id: 'g2', rush_attempt: '1', yards_gained: '12' }),
  play({ game_id: 'g3', rush_attempt: '1', yards_gained: '0' }),
  // Excluded: a kneel is not line play.
  play({ game_id: 'g3', rush_attempt: '1', qb_kneel: '1', yards_gained: '-1' }),
  // Skipped: a carry with no yardage can't be weighted.
  play({ game_id: 'g4', rush_attempt: '1', yards_gained: '' }),

  // --- Team A dropbacks: 3, 1 sack, 2 charted pressures, ttt 2.5 + 3.0, rushers 4+5+4
  play({
    game_id: 'g3',
    qb_dropback: '1',
    was_pressure: '1',
    time_to_throw: '2.5',
    number_of_pass_rushers: '4',
  }),
  play({
    game_id: 'g3',
    qb_dropback: '1',
    sack: '1',
    was_pressure: '1',
    time_to_throw: '',
    number_of_pass_rushers: '5',
  }),
  play({
    game_id: 'g4',
    qb_dropback: '1',
    was_pressure: '0',
    time_to_throw: '3',
    number_of_pass_rushers: '4',
  }),

  // --- Team B: charted in only 1 of its 4 games => below coverage, no row.
  play({ game_id: 'g1', posteam: 'BBB', rush_attempt: '1', yards_gained: '5' }),

  // Unresolvable team code => skipped.
  play({ game_id: 'g1', posteam: 'ZZZ', rush_attempt: '1', yards_gained: '5' }),
];

function findRow(rows: TeamLineStatsInsert[], teamId: string): TeamLineStatsInsert {
  const row = rows.find((r) => r.team_id === teamId);
  if (!row) throw new Error(`no row for ${teamId}`);
  return row;
}

describe('lineYardsFor', () => {
  it('weights a loss at 120%', () => {
    expect(lineYardsFor(-3)).toBeCloseTo(-3.6, 10);
  });
  it('credits 0-4 yards at 100%, 5-10 at 50%, and 11+ at 0%', () => {
    expect(lineYardsFor(0)).toBe(0);
    expect(lineYardsFor(4)).toBe(4);
    expect(lineYardsFor(5)).toBeCloseTo(2.5, 10);
    expect(lineYardsFor(10)).toBeCloseTo(5, 10);
    expect(lineYardsFor(11)).toBe(0);
    expect(lineYardsFor(80)).toBe(0);
  });
});

describe('toTeamLineStatsRows', () => {
  const result = toTeamLineStatsRows(FIXTURE, 2024, resolve, GAMES);

  it('derives ALY, stuffed rate, power success, and level yards from the hand-computed fixture', () => {
    const row = findRow(result.rows, 'team-a');
    expect(row.season).toBe(2024);
    expect(row.rushes).toBe(5);
    expect(row.line_yards).toBeCloseTo(4.1, 10);
    expect(row.adjusted_line_yards).toBeCloseTo(0.82, 10);
    expect(row.stuffed_rate).toBeCloseTo(0.4, 10);
    expect(row.power_success_rate).toBeCloseTo(1, 10);
    expect(row.second_level_yards).toBeCloseTo(7, 10);
    expect(row.second_level_yards_per_rush).toBeCloseTo(1.4, 10);
    expect(row.open_field_yards).toBeCloseTo(12, 10);
    expect(row.open_field_yards_per_rush).toBeCloseTo(2.4, 10);
  });

  it('derives sack rate, pressure rate, time to throw, and pass rushers', () => {
    const row = findRow(result.rows, 'team-a');
    expect(row.dropbacks).toBe(3);
    expect(row.sacks_allowed).toBe(1);
    expect(row.sack_rate).toBeCloseTo(1 / 3, 10);
    expect(row.pressures_allowed).toBe(2);
    expect(row.pressure_rate).toBeCloseTo(2 / 3, 10);
    expect(row.avg_time_to_throw).toBeCloseTo(2.75, 10);
    expect(row.avg_pass_rushers).toBeCloseTo(13 / 3, 10);
  });

  it('emits no row for a season whose charted coverage is too sparse', () => {
    expect(result.rows.map((r) => r.team_id)).toEqual(['team-a']);
    expect(result.skippedTeams).toEqual(['team-b']);
  });

  it('counts excluded/unresolvable plays as skipped', () => {
    expect(result.skipped).toBe(3); // kneel + no-yardage carry + unresolvable code
  });
});

describe('toTeamLineStatsRows sparse families', () => {
  it('yields nil (never zero) for a family with no sample', () => {
    const rows = toTeamLineStatsRows(
      [
        play({ game_id: 'g1', rush_attempt: '1', yards_gained: '4' }),
        play({ game_id: 'g2', qb_dropback: '1', sack: '1' }),
      ],
      2024,
      resolve,
      new Map([['team-a', 2]])
    );
    const row = findRow(rows.rows, 'team-a');
    // One carry that gained 4, never stuffed, and a dropback nobody charted.
    expect(row.stuffed_rate).toBe(0);
    expect(row.power_success_rate).toBeNull();
    expect(row.pressures_allowed).toBeNull();
    expect(row.pressure_rate).toBeNull();
    expect(row.avg_time_to_throw).toBeNull();
    expect(row.avg_pass_rushers).toBeNull();
  });
});

describe('toTeamLineStatsRows season type', () => {
  it('ignores postseason plays when deriving regular-season metrics', () => {
    const rows = toTeamLineStatsRows(
      [
        play({ game_id: 'reg', season_type: 'REG', rush_attempt: '1', yards_gained: '4' }),
        play({ game_id: 'post', season_type: 'POST', rush_attempt: '1', yards_gained: '80' }),
      ],
      2024,
      resolve,
      new Map([['team-a', 1]])
    );

    const row = findRow(rows.rows, 'team-a');
    expect(row.rushes).toBe(1);
    expect(row.line_yards).toBe(4);
  });
});
