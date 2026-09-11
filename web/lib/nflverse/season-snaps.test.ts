import { describe, it, expect } from 'vitest';
import { toSeasonSnapTotals } from './season-snaps';

const CROSSWALK = new Map([
  ['A', 'espn-a'],
  ['B', 'espn-b'],
]);

function row(overrides: Record<string, string>): Record<string, string> {
  return {
    game_id: 'g1',
    season: '2024',
    game_type: 'REG',
    team: 'SEA',
    pfr_player_id: 'A',
    offense_snaps: '0',
    offense_pct: '0',
    defense_snaps: '0',
    defense_pct: '0',
    st_snaps: '0',
    st_pct: '0',
    ...overrides,
  };
}

describe('toSeasonSnapTotals', () => {
  it('sums season snaps and computes snap-weighted shares from the per-game percentage', () => {
    const { rows } = toSeasonSnapTotals(
      [
        // 10 snaps at a 0.5 share means the team ran 20 plays; same for B.
        row({
          game_id: 'g1',
          pfr_player_id: 'A',
          offense_snaps: '10',
          offense_pct: '0.5',
          defense_snaps: '5',
          defense_pct: '0.5',
        }),
        row({
          game_id: 'g1',
          pfr_player_id: 'B',
          offense_snaps: '10',
          offense_pct: '0.5',
          defense_snaps: '5',
          defense_pct: '0.5',
        }),
        row({
          game_id: 'g2',
          season: '2023',
          pfr_player_id: 'A',
          offense_snaps: '20',
          offense_pct: '1',
          defense_snaps: '5',
          defense_pct: '1',
          st_snaps: '2',
          st_pct: '1',
        }),
        row({ game_id: 'g2', season: '2023', pfr_player_id: 'B' }),
      ],
      CROSSWALK
    );

    expect(rows).toEqual([
      {
        player_id: 'espn-a',
        season: 2024,
        offense_snaps: 10,
        offense_pct: 0.5,
        defense_snaps: 5,
        defense_pct: 0.5,
        special_teams_snaps: 0,
        special_teams_pct: null,
      },
      {
        player_id: 'espn-b',
        season: 2024,
        offense_snaps: 10,
        offense_pct: 0.5,
        defense_snaps: 5,
        defense_pct: 0.5,
        special_teams_snaps: 0,
        special_teams_pct: null,
      },
      {
        player_id: 'espn-a',
        season: 2023,
        offense_snaps: 20,
        offense_pct: 1,
        defense_snaps: 5,
        defense_pct: 1,
        special_teams_snaps: 2,
        special_teams_pct: 1,
      },
    ]);
  });

  it('emits no row for a crosswalk miss, without affecting a resolved player', () => {
    const { rows, unresolvedRows } = toSeasonSnapTotals(
      [
        row({ pfr_player_id: 'A', offense_snaps: '10', offense_pct: '0.5' }),
        row({ pfr_player_id: 'unknown', offense_snaps: '10', offense_pct: '0.5' }),
      ],
      CROSSWALK
    );
    expect(unresolvedRows).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].offense_pct).toBe(0.5);
  });

  it('skips a duplicate (season, game, player) row', () => {
    const { rows, malformedRows } = toSeasonSnapTotals(
      [
        row({ pfr_player_id: 'A', offense_snaps: '10', offense_pct: '0.5' }),
        row({ pfr_player_id: 'A', offense_snaps: '99', offense_pct: '0.5' }),
      ],
      CROSSWALK
    );
    expect(malformedRows).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].offense_snaps).toBe(10);
  });

  it('drops non-REG, malformed, and snaps-without-a-usable-percentage rows', () => {
    const { rows, malformedRows } = toSeasonSnapTotals(
      [
        row({ pfr_player_id: 'A', game_type: 'POST', offense_snaps: '10', offense_pct: '0.5' }),
        row({ pfr_player_id: 'A', offense_snaps: 'abc', offense_pct: '0.5' }),
        row({ pfr_player_id: 'A', season: 'not-a-year' }),
        // snaps recorded but no derivable team denominator -> cannot compute a share
        row({ pfr_player_id: 'A', offense_snaps: '10', offense_pct: '0' }),
      ],
      CROSSWALK
    );
    expect(rows).toHaveLength(0);
    expect(malformedRows).toBe(3);
  });

  it('drops a resolved player with zero total snaps', () => {
    const { rows } = toSeasonSnapTotals([row({ pfr_player_id: 'A' })], CROSSWALK);
    expect(rows).toHaveLength(0);
  });
});
