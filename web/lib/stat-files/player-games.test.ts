import { describe, expect, it } from 'vitest';
import {
  buildGameIndex,
  buildPlayerGamesFiles,
  consolidateGames,
  type ScheduledGame,
} from './player-games';
import { playerGamesKey } from './layout';
import { createPublisher, type StatFileTarget } from './publish';
import { consolidateSeason, toPlayerWeekRows, type WeeklyCsvRow } from './player-seasons';

const GSIS = new Map([['00-0001', 'espn-1']]);
const PFR = new Map([['PlayA00', 'espn-1']]);

const SCHEDULE: ScheduledGame[] = [
  { game_id: '2025_01_MIA_BUF', season: 2025, week: 1, home_team_id: 'buf', away_team_id: 'mia' },
  { game_id: '2025_02_BUF_NYJ', season: 2025, week: 2, home_team_id: 'nyj', away_team_id: 'buf' },
  { game_id: '2025_19_BUF_DEN', season: 2025, week: 19, home_team_id: 'den', away_team_id: 'buf' },
];
const INDEX = buildGameIndex(SCHEDULE);

function box(overrides: WeeklyCsvRow): WeeklyCsvRow {
  return {
    player_id: '00-0001',
    season: '2025',
    week: '1',
    season_type: 'REG',
    team: 'buf',
    ...overrides,
  };
}

function toBox(csv: WeeklyCsvRow[]) {
  return toPlayerWeekRows(csv, {
    idColumn: 'player_id',
    crosswalk: GSIS,
    teamColumn: 'team',
    seasonTypeColumn: 'season_type',
    weekColumn: 'week',
  }).rows;
}

function toPfr(csv: WeeklyCsvRow[]) {
  return toPlayerWeekRows(csv, {
    idColumn: 'pfr_player_id',
    crosswalk: PFR,
    teamColumn: 'team',
    seasonTypeColumn: 'game_type',
    weekColumn: 'week',
  }).rows;
}

describe('buildGameIndex', () => {
  it('maps both teams of a game to the game and their opponent', () => {
    expect(INDEX.get('2025\u00001\u0000buf')).toEqual({
      game_id: '2025_01_MIA_BUF',
      opponent: 'mia',
    });
    expect(INDEX.get('2025\u00001\u0000mia')).toEqual({
      game_id: '2025_01_MIA_BUF',
      opponent: 'buf',
    });
  });

  it('skips a game with no week', () => {
    const index = buildGameIndex([{ ...SCHEDULE[0], week: null }]);
    expect(index.size).toBe(0);
  });
});

describe('consolidateGames', () => {
  const rows = toBox([
    box({ week: '1', passing_yards: '300' }),
    box({ week: '2', passing_yards: '200' }),
    box({ week: '19', season_type: 'POST', passing_yards: '250' }),
  ]);

  it('writes one row per weekly source row, so the count matches the source', () => {
    const games = consolidateGames(2025, { box: rows }, INDEX);
    expect(games).toHaveLength(rows.length);
    expect(games.map((game) => game.box?.passing_yards)).toEqual([300, 200, 250]);
  });

  it('labels postseason weeks and orders REG before POST', () => {
    const games = consolidateGames(2025, { box: [...rows].reverse() }, INDEX);
    expect(games.map((game) => [game.season_type, game.week])).toEqual([
      ['REG', 1],
      ['REG', 2],
      ['POST', 19],
    ]);
  });

  it('joins game id and opponent through the schedule', () => {
    const [first, second] = consolidateGames(2025, { box: rows }, INDEX);
    expect(first.game_id).toBe('2025_01_MIA_BUF');
    expect(first.opponent).toBe('mia');
    expect(second.opponent).toBe('nyj');
  });

  it('omits game identity when the schedule has no match, never guessing', () => {
    const [game] = consolidateGames(2025, { box: rows }, buildGameIndex([]));
    expect(game.game_id).toBeUndefined();
    expect(game.opponent).toBeUndefined();
  });

  it('omits a section whose source has no row for that week', () => {
    const pfr = toPfr([
      {
        pfr_player_id: 'PlayA00',
        season: '2025',
        week: '2',
        game_type: 'REG',
        team: 'buf',
        carries: '10',
        rushing_yards_before_contact: '30',
      },
    ]);
    const games = consolidateGames(2025, { box: rows, pfr }, INDEX);
    expect(games.find((game) => game.week === 1)?.pfr).toBeUndefined();
    expect(games.find((game) => game.week === 2)?.pfr?.carries).toBe(10);
    expect(games.find((game) => game.week === 2)?.pfr?.rushing_yards_before_contact_avg).toBe(3);
  });

  it('merges a player-week that several source families contribute to', () => {
    const pfr = toPfr([
      {
        pfr_player_id: 'PlayA00',
        season: '2025',
        week: '1',
        game_type: 'REG',
        team: 'buf',
        carries: '4',
      },
      {
        pfr_player_id: 'PlayA00',
        season: '2025',
        week: '1',
        game_type: 'REG',
        team: 'buf',
        times_sacked: '2',
      },
    ]);
    const games = consolidateGames(2025, { pfr }, INDEX);
    expect(games).toHaveLength(1);
    expect(games[0].pfr).toMatchObject({ carries: 4, times_sacked: 2 });
  });

  it('keeps a traded player’s weeks on the team they played for', () => {
    const traded = toBox([
      box({ week: '1', team: 'buf', passing_yards: '1' }),
      box({ week: '2', team: 'nyj', passing_yards: '2' }),
    ]);
    const games = consolidateGames(2025, { box: traded }, INDEX);
    expect(games.map((game) => game.team)).toEqual(['buf', 'nyj']);
  });

  it('matches the season fold: summed game lines equal the season line', () => {
    const games = consolidateGames(2025, { box: rows }, INDEX);
    const [season] = consolidateSeason(2025, { box: rows }).filter((r) => r.season_type === 'REG');
    const summed = games
      .filter((game) => game.season_type === 'REG')
      .reduce((total, game) => total + (game.box?.passing_yards as number), 0);
    expect(summed).toBe(season.box?.passing_yards);
  });

  it('is deterministic regardless of input order', () => {
    const forward = JSON.stringify(consolidateGames(2025, { box: rows }, INDEX));
    const reverse = JSON.stringify(consolidateGames(2025, { box: [...rows].reverse() }, INDEX));
    expect(reverse).toBe(forward);
  });

  it('ignores rows from other seasons', () => {
    const other = toBox([box({ season: '2024', passing_yards: '9' })]);
    expect(consolidateGames(2025, { box: other }, INDEX)).toHaveLength(0);
  });
});

describe('buildPlayerGamesFiles', () => {
  it('splits a season into one file per player without repeating identity per game', () => {
    const games = consolidateGames(
      2025,
      { box: toBox([box({ passing_yards: '1' }), box({ week: '2', passing_yards: '2' })]) },
      INDEX
    );
    const files = buildPlayerGamesFiles(2025, games, 1);
    const file = files.get('espn-1');
    expect(file?.season).toBe(2025);
    expect(file?.games).toHaveLength(2);
    expect('player_id' in (file?.games[0] ?? {})).toBe(false);
    expect('season' in (file?.games[0] ?? {})).toBe(false);
  });
});

describe('publishing game logs', () => {
  it('uploads nothing on a second identical build', async () => {
    const store = new Map<string, Uint8Array>();
    const target: StatFileTarget = {
      get: async (key) => store.get(key) ?? null,
      put: async (key, body) => {
        store.set(key, body);
      },
    };
    const build = async () => {
      const publisher = await createPublisher(target, { currentSeason: 2025 });
      const games = consolidateGames(
        2025,
        { box: toBox([box({ passing_yards: '1' }), box({ week: '2', passing_yards: '2' })]) },
        INDEX
      );
      for (const [playerId, file] of buildPlayerGamesFiles(2025, games, 1)) {
        await publisher.put(playerGamesKey(playerId, 2025), file);
      }
      await publisher.flush();
      return publisher;
    };
    const first = await build();
    expect(first.uploaded).toBe(1);
    const second = await build();
    expect(second.uploaded).toBe(0);
    expect(second.skipped).toBe(1);
  });
});
