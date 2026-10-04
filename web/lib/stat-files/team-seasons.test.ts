import { describe, expect, it } from 'vitest';
import { resolveTeamCode } from '@/lib/nflverse/team-codes';
import {
  allowedRates,
  buildTeamFiles,
  rankAllowed,
  RECENT_WINDOW,
  toTeamGameRows,
  type TeamGameRow,
  type TeamLine,
} from './team-seasons';

function csvRow(
  game: string,
  team: string,
  opponent: string,
  week: number,
  stats: Record<string, string> = {},
  seasonType = 'REG'
): Record<string, string> {
  return {
    season: '2025',
    week: String(week),
    team,
    season_type: seasonType,
    game_id: game,
    opponent_team: opponent,
    passing_yards: '200',
    rushing_yards: '100',
    ...stats,
  };
}

describe('toTeamGameRows', () => {
  it("joins each game to the opponent's offense as the allowed line", () => {
    const { rows } = toTeamGameRows(
      [
        csvRow('g1', 'BUF', 'NYJ', 1, { passing_yards: '250', rushing_epa: '-1.5' }),
        csvRow('g1', 'NYJ', 'BUF', 1, { passing_yards: '120' }),
      ],
      resolveTeamCode
    );
    const bills = rows.find((row) => row.team === 'bills');
    expect(bills?.offense).toMatchObject({ passing_yards: 250, rushing_epa: -1.5 });
    expect(bills?.opponent).toBe('jets');
    expect(bills?.allowed).toMatchObject({ passing_yards: 120, rushing_yards: 100 });
    expect(rows.find((row) => row.team === 'jets')?.allowed).toMatchObject({ passing_yards: 250 });
  });

  it('omits a blank cell instead of writing zero', () => {
    const { rows } = toTeamGameRows(
      [
        csvRow('g1', 'BUF', 'NYJ', 1, { passing_epa: '' }),
        csvRow('g1', 'NYJ', 'BUF', 1, { passing_epa: ' ' }),
      ],
      resolveTeamCode
    );
    expect(rows[0].offense).not.toHaveProperty('passing_epa');
    expect(rows[0].allowed).not.toHaveProperty('passing_epa');
  });

  it('leaves allowed absent when the opponent has no row for the game', () => {
    const { rows } = toTeamGameRows([csvRow('g1', 'BUF', 'NYJ', 1)], resolveTeamCode);
    expect(rows[0]).not.toHaveProperty('allowed');
  });

  it('folds relocated franchise codes and counts unknown ones without guessing', () => {
    const result = toTeamGameRows(
      [
        csvRow('g1', 'LA', 'OAK', 1),
        csvRow('g1', 'OAK', 'LA', 1),
        csvRow('g2', 'XXX', 'BUF', 2),
        csvRow('g2', 'BUF', 'XXX', 2),
      ],
      resolveTeamCode
    );
    expect(result.rows.map((row) => row.team).sort()).toEqual(['raiders', 'rams']);
    expect(result.unresolved).toBe(2);
  });

  it('skips rows missing a game id, week or team', () => {
    const result = toTeamGameRows(
      [
        csvRow('', 'BUF', 'NYJ', 1),
        { ...csvRow('g1', 'BUF', 'NYJ', 1), week: '' },
        { ...csvRow('g1', 'BUF', 'NYJ', 1), team: '' },
        { ...csvRow('g1', 'BUF', 'NYJ', 1), season: 'abc' },
      ],
      resolveTeamCode
    );
    expect(result.rows).toEqual([]);
    expect(result.skipped).toBe(4);
  });

  it('labels a non-regular season type POST', () => {
    const { rows } = toTeamGameRows([csvRow('g1', 'BUF', 'NYJ', 19, {}, 'WC')], resolveTeamCode);
    expect(rows[0].season_type).toBe('POST');
  });
});

describe('allowedRates', () => {
  const lines: TeamLine[] = [
    {
      passing_yards: 200,
      rushing_yards: 100,
      passing_epa: 4,
      rushing_epa: -2,
      attempts: 30,
      sacks_suffered: 2,
      carries: 20,
    },
    {
      passing_yards: 100,
      rushing_yards: 50,
      passing_epa: -4,
      rushing_epa: 2,
      attempts: 28,
      sacks_suffered: 0,
      carries: 20,
    },
  ];

  it('averages per game and divides EPA by plays', () => {
    expect(allowedRates(lines)).toEqual({
      passing_epa: 0,
      passing_epa_per_dropback: 0,
      passing_yards: 150,
      rushing_epa: 0,
      rushing_epa_per_carry: 0,
      rushing_yards: 75,
      total_yards: 225,
    });
    expect(allowedRates([{ passing_epa: 3, attempts: 9, sacks_suffered: 1 }])).toMatchObject({
      passing_epa_per_dropback: 0.3,
    });
  });

  it('omits a metric when any game lacks its inputs, never summing the rest', () => {
    const rates = allowedRates([lines[0], { ...lines[1], passing_yards: undefined }]);
    expect(rates).not.toHaveProperty('passing_yards');
    expect(rates).not.toHaveProperty('total_yards');
    expect(rates.rushing_yards).toBe(75);
  });

  it('is empty with no games', () => {
    expect(allowedRates([])).toEqual({});
  });
});

describe('rankAllowed', () => {
  it('ranks the team that allowed least first and lets ties share a rank', () => {
    const ranks = rankAllowed(
      new Map([
        ['a', { passing_yards: 100 }],
        ['b', { passing_yards: 200 }],
        ['c', { passing_yards: 200 }],
        ['d', { passing_yards: 300 }],
      ])
    );
    expect([...ranks].map(([team, r]) => [team, r.passing_yards])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 2],
      ['d', 4],
    ]);
  });

  it('skips a metric a team does not have', () => {
    const ranks = rankAllowed(
      new Map([
        ['a', { passing_yards: 100, rushing_yards: 50 }],
        ['b', { passing_yards: 200 }],
      ])
    );
    expect(ranks.get('b')).toEqual({ passing_yards: 2 });
  });
});

describe('buildTeamFiles', () => {
  /** A team that allowed `yards` passing yards in each of `weeks` regular-season games. */
  function teamRows(
    team: string,
    weeks: number[],
    yards: number | ((week: number) => number),
    season = 2025
  ): TeamGameRow[] {
    return weeks.map((week) => ({
      team,
      season,
      season_type: 'REG' as const,
      week,
      game_id: `${season}_${week}_${team}`,
      opponent: 'opp',
      offense: { passing_yards: 100 },
      allowed: { passing_yards: typeof yards === 'number' ? yards : yards(week) },
    }));
  }

  const season = (rows: TeamGameRow[]) => new Map([[2025, rows]]);
  const entry = (rows: TeamGameRow[], team: string) =>
    buildTeamFiles(season(rows), 1).get(team)?.seasons[0];

  it('ranks season and last-3 windows across teams', () => {
    const rows = [
      // Allowed 100 early then 300 late: best season rank, worst recent form.
      ...teamRows('a', [1, 2, 3, 4, 5, 6], (w) => (w <= 3 ? 100 : 300)),
      ...teamRows('b', [1, 2, 3, 4, 5, 6], 200),
      ...teamRows('c', [1, 2, 3, 4, 5, 6], (w) => (w <= 3 ? 300 : 100)),
    ];
    const a = entry(rows, 'a')?.derived;
    const c = entry(rows, 'c')?.derived;
    expect(a).toMatchObject({
      games: 6,
      ranked_teams: 3,
      allowed_per_game: { passing_yards: 200 },
      recent: { games: 3, through_week: 6, allowed_per_game: { passing_yards: 300 } },
    });
    // a and c tie on the season (200), b ties too: all rank 1.
    expect(a?.ranks?.passing_yards).toBe(1);
    expect(a?.recent?.ranks?.passing_yards).toBe(3);
    expect(c?.recent?.ranks?.passing_yards).toBe(1);
    expect(RECENT_WINDOW).toBe(3);
  });

  it('never ranks a team below two games and leaves it out of the denominator', () => {
    const rows = [
      ...teamRows('a', [1, 2, 3], 100),
      ...teamRows('b', [1, 2, 3], 200),
      ...teamRows('thin', [1], 50),
    ];
    const thin = entry(rows, 'thin')?.derived;
    expect(thin).toMatchObject({ games: 1, allowed_per_game: { passing_yards: 50 } });
    expect(thin).not.toHaveProperty('ranks');
    expect(thin).not.toHaveProperty('recent');
    expect(entry(rows, 'a')?.derived?.ranked_teams).toBe(2);
    expect(entry(rows, 'b')?.derived?.ranks?.passing_yards).toBe(2);
  });

  it('keeps playoff games in the lines but out of ranks and rates', () => {
    const playoff: TeamGameRow = {
      ...teamRows('a', [19], 900)[0],
      season_type: 'POST',
    };
    const rows = [...teamRows('a', [1, 2], 100), playoff, ...teamRows('b', [1, 2], 200)];
    const a = entry(rows, 'a');
    expect(a?.derived?.allowed_per_game.passing_yards).toBe(100);
    expect(a?.derived?.games).toBe(2);
    expect(a?.games.map((game) => [game.season_type, game.week])).toEqual([
      ['REG', 1],
      ['REG', 2],
      ['POST', 19],
    ]);
  });

  it('leaves a game with no allowed line out of the derived values', () => {
    const rows = teamRows('a', [1, 2, 3], 100);
    delete rows[0].allowed;
    expect(entry(rows, 'a')?.derived?.games).toBe(2);
  });

  it('omits derived entirely for a team with no regular-season allowed line', () => {
    const only = teamRows('a', [19], 100).map((row) => ({ ...row, season_type: 'POST' as const }));
    expect(entry(only, 'a')).not.toHaveProperty('derived');
  });

  it('writes seasons newest first, one file per team, and a stable body', () => {
    const files = buildTeamFiles(
      new Map([
        [2024, teamRows('a', [1, 2], 100, 2024)],
        [2025, [...teamRows('a', [1, 2], 100), ...teamRows('b', [1, 2], 200)]],
      ]),
      1
    );
    expect([...files.keys()]).toEqual(['a', 'b']);
    expect(files.get('a')?.seasons.map((s) => s.season)).toEqual([2025, 2024]);
    expect(files.get('b')?.seasons.map((s) => s.season)).toEqual([2025]);

    const keysOf = (value: unknown): string[] =>
      value && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)])
        : [];
    const file = files.get('a');
    const reversed = buildTeamFiles(
      new Map([
        [2025, [...teamRows('a', [2, 1], 100), ...teamRows('b', [2, 1], 200)]],
        [2024, teamRows('a', [2, 1], 100, 2024)],
      ]),
      1
    ).get('a');
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(file));
    expect(JSON.stringify(file)).not.toMatch(/null|generated_at/);
    // Every object's keys are already in sorted order.
    const sortedObjects = (value: unknown): boolean =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.keys(value).join() === Object.keys(value).sort().join() &&
          Object.values(value).every(sortedObjects)
        : Array.isArray(value)
          ? value.every(sortedObjects)
          : true;
    expect(sortedObjects(file)).toBe(true);
    expect(keysOf(file)).toContain('recent_window');
  });
});
