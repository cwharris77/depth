import { describe, it, expect, vi } from 'vitest';
import {
  checkHeader,
  assertHeader,
  unexpectedColumns,
  sourceContract,
  type SourceContract,
} from './source-contract';
import { parseCsvHeader, parseCsv } from './csv';
import { toPlayerStatsRows, type PlayerStatsInsert } from './transform';

describe('checkHeader', () => {
  const base: SourceContract = {
    id: 'test-source',
    columns: ['player_id', 'season', 'passing_yards'],
  };

  it('fails a missing required column and names it', () => {
    expect(checkHeader(base, ['player_id', 'season'])).toEqual({
      ok: false,
      missing: ['passing_yards'],
    });
  });

  it('passes when every required column is present', () => {
    expect(checkHeader(base, ['player_id', 'season', 'passing_yards'])).toEqual({ ok: true });
  });

  it('ignores an extra column', () => {
    expect(
      checkHeader(base, ['player_id', 'season', 'passing_yards', 'brand_new_upstream_column'])
    ).toEqual({ ok: true });
  });

  it('allows an optional column to be absent', () => {
    const contract: SourceContract = {
      id: 'test-source',
      columns: ['player_id', 'season_type'],
      optionalColumns: ['season_type'],
    };
    expect(checkHeader(contract, ['player_id'])).toEqual({ ok: true });
  });

  it('satisfies a contract column through an alias for a renamed upstream column', () => {
    const contract: SourceContract = {
      id: 'test-source',
      columns: ['player_id', 'passing_yards'],
      columnAliases: { passing_yardz: 'passing_yards' },
    };
    expect(checkHeader(contract, ['player_id', 'passing_yardz'])).toEqual({ ok: true });
  });

  it('does not report an aliased upstream name as an unexpected column', () => {
    const contract: SourceContract = {
      id: 'test-source',
      columns: ['player_id', 'passing_yards'],
      columnAliases: { passing_yardz: 'passing_yards' },
      knownColumns: ['player_id', 'passing_yards'],
    };
    expect(unexpectedColumns(contract, ['player_id', 'passing_yardz'])).toEqual([]);
  });
});

describe('assertHeader', () => {
  it('throws a message naming the source and every missing column', () => {
    expect(() => assertHeader(sourceContract('stats_player_reg'), ['player_id', 'season'])).toThrow(
      /stats_player_reg: nflverse source header changed — missing column\(s\): .*games/
    );
  });

  it('reports an upstream addition once per source, not once per call', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logged = new Set<string>();
    const contract = sourceContract('ftn_charting');
    const header = [...contract.columns, 'new_ftn_column'];

    assertHeader(contract, header, logged);
    assertHeader(contract, header, logged);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain('new_ftn_column');
    log.mockRestore();
  });

  it('reports nothing new for a curated source whose full header is not tracked', () => {
    expect(unexpectedColumns(sourceContract('stats_player_reg'), ['totally_new_column'])).toEqual(
      []
    );
  });
});

describe('raw contracts', () => {
  it('requires the stored union for a partitioned raw source', () => {
    const contract = sourceContract('pfr_advstats');
    expect(contract.columns).toContain('pfr_player_id');
    expect(contract.columns).toContain('season');
    expect(contract.columns).toContain('week');
    expect(contract.columns).toContain('times_pressured');
    expect(contract.columns).toContain('def_ints');
  });

  it('requires the play key columns for the FTN source', () => {
    const contract = sourceContract('ftn_charting');
    expect(contract.columns).toContain('ftn_game_id');
    expect(contract.columns).toContain('ftn_play_id');
  });
});

// The ingest's failure posture: the header check runs before the transform, so a renamed
// column records a failure naming the column and no row for that source-season is
// produced (mirrors scripts/ingest-nflverse.mts's try { assertHeader; transform } catch).
function runPlayerStatsStep(
  contract: SourceContract,
  csv: string
): { rows: PlayerStatsInsert[]; failure: string | null } {
  const crosswalk = new Map([['gsis-1', 'espn-1']]);
  const knownPlayerIds = new Set(['espn-1']);
  try {
    assertHeader(contract, parseCsvHeader(csv));
    const { rows } = toPlayerStatsRows(parseCsv(csv), crosswalk, knownPlayerIds, (code) =>
      code === 'KC' ? 'chiefs' : null
    );
    return { rows, failure: null };
  } catch (e) {
    return { rows: [], failure: (e as Error).message };
  }
}

describe('ingest source-shape guard (fixture CSV)', () => {
  const contract = sourceContract('stats_player_reg');
  const header = contract.columns.join(',');
  const valueFor = (column: string): string => {
    if (column === 'player_id') return 'gsis-1';
    if (column === 'season') return '2025';
    if (column === 'season_type') return 'REG';
    if (column === 'recent_team') return 'KC';
    return '1';
  };
  const validCsv = `${header}\n${contract.columns.map(valueFor).join(',')}`;

  it('writes a row when the header matches the contract', () => {
    const result = runPlayerStatsStep(contract, validCsv);
    expect(result.failure).toBeNull();
    expect(result.rows).toEqual([expect.objectContaining({ player_id: 'espn-1', season: 2025 })]);
  });

  it('writes no rows and records a failure when a required column is renamed', () => {
    const renamed = header.replace('passing_yards', 'passing_yardz');
    const row = contract.columns.map((column) => valueFor(column)).join(',');
    const result = runPlayerStatsStep(contract, `${renamed}\n${row}`);
    expect(result.rows).toEqual([]);
    expect(result.failure).toMatch(/passing_yards/);
  });
});
