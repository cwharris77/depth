import { describe, expect, it } from 'vitest';
import { toDraftPickRows } from './transform';

const crosswalk = new Map([
  ['gsis', 'espn'],
  ['unknown', 'absent'],
]);
const known = new Set(['espn']);
const pick = {
  gsis_id: 'gsis',
  season: '2020',
  round: '1',
  pick: '12',
  team: 'OAK',
  college: 'Alabama',
};

describe('toDraftPickRows', () => {
  it('maps draft facts and preserves the historical team abbreviation', () => {
    expect(toDraftPickRows([pick], crosswalk, known)).toEqual({
      rows: [
        {
          player_id: 'espn',
          season: 2020,
          round: 1,
          pick: 12,
          team_abbrev: 'OAK',
          college: 'Alabama',
        },
      ],
      dropped: [],
    });
  });
  it.each([false, true])(
    'keeps the most recent draft regardless of input order (%s)',
    (reverse) => {
      const input = [pick, { ...pick, season: '2021', pick: '20' }];
      const result = toDraftPickRows(reverse ? input.reverse() : input, crosswalk, known);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({ season: 2021, pick: 20 });
      expect(result.dropped).toEqual([{ reason: 'duplicate_player', key: 'gsis' }]);
    }
  );
  it('skips missing identities, crosswalk misses and unknown players', () => {
    const result = toDraftPickRows(
      [
        { ...pick, gsis_id: '' },
        { ...pick, gsis_id: 'miss' },
        { ...pick, gsis_id: 'unknown' },
      ],
      crosswalk,
      known
    );
    expect(result.rows).toEqual([]);
    expect(result.dropped.map((drop) => drop.reason)).toEqual([
      'missing_player_id',
      'no_crosswalk_match',
      'unknown_player',
    ]);
  });
  it.each(['', 'NA', 'Infinity', '2020.5', '0', '32768'])(
    'rejects invalid seasons (%s)',
    (season) => {
      expect(toDraftPickRows([{ ...pick, season }], crosswalk, known).rows).toEqual([]);
    }
  );
  it('treats unavailable optional draft facts as null', () => {
    expect(
      toDraftPickRows(
        [{ ...pick, round: 'NA', pick: '', team: '', college: ' NA ' }],
        crosswalk,
        known
      ).rows[0]
    ).toMatchObject({ round: null, pick: null, team_abbrev: null, college: null });
  });
});
