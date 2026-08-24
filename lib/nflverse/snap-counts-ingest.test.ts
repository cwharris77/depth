import { describe, expect, it, vi } from 'vitest';
import { ingestRecentSnapSeason, ingestRecentSnapSeasons } from './snap-counts-ingest';

const pfrToEspn = new Map([
  ['MahoPa00', '3139477'],
  ['RiceRa00', '4426338'],
]);

const resolveTeam = (code: string): string | null => (code === 'KC' ? 'chiefs' : null);

const validCsv = [
  'game_id,season,game_type,week,player,pfr_player_id,team,offense_snaps,offense_pct,defense_snaps,defense_pct,st_snaps,st_pct',
  '2025_01_KC_LAC,2025,REG,1,Patrick Mahomes,MahoPa00,KC,60,1,0,0,2,0.1',
  '2025_01_KC_LAC,2025,REG,1,Rashee Rice,RiceRa00,KC,45,0.75,0,0,0,0',
].join('\n');

describe('ingestRecentSnapSeason', () => {
  it('does not call the writer when the source fetch fails', async () => {
    const upsert = vi.fn();
    const promise = ingestRecentSnapSeason({
      season: 2025,
      fetchCsv: async () => {
        throw new Error('source unavailable');
      },
      pfrToEspn,
      resolveTeam,
      updatedAt: '2026-08-24T12:00:00.000Z',
      upsert,
    });

    await expect(promise).rejects.toThrow('source unavailable');
    await expect(promise).rejects.not.toHaveProperty('diagnostics');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a malformed transform without calling the writer', async () => {
    const upsert = vi.fn();
    const promise = ingestRecentSnapSeason({
      season: 2025,
      fetchCsv: async () =>
        'game_id,season,game_type,week,pfr_player_id,team,offense_snaps\n,2025,REG,1,,KC,-1',
      pfrToEspn,
      resolveTeam,
      updatedAt: '2026-08-24T12:00:00.000Z',
      upsert,
    });

    await expect(promise).rejects.toMatchObject({
      message: 'snap counts 2025 produced zero summaries',
      diagnostics: { fetchedRows: 1, malformedRows: 1, summaries: 0 },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects missing unit headers without calling the writer', async () => {
    const upsert = vi.fn();
    const csv = [
      'game_id,season,game_type,week,pfr_player_id,team,offense_snaps,offense_pct,st_snaps,st_pct',
      '2025_01_KC_LAC,2025,REG,1,MahoPa00,KC,60,1,2,0.1',
    ].join('\n');

    await expect(
      ingestRecentSnapSeason({
        season: 2025,
        fetchCsv: async () => csv,
        pfrToEspn,
        resolveTeam,
        updatedAt: '2026-08-24T12:00:00.000Z',
        upsert,
      })
    ).rejects.toThrow('snap counts 2025 produced zero summaries');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('calls the writer once with the shared updated_at after a valid transform', async () => {
    const upsert = vi.fn(async () => undefined);
    const result = await ingestRecentSnapSeason({
      season: 2025,
      fetchCsv: async () => validCsv,
      pfrToEspn,
      resolveTeam,
      updatedAt: '2026-08-24T12:00:00.000Z',
      upsert,
    });

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          team_id: 'chiefs',
          season: 2025,
          player_id: '3139477',
          updated_at: '2026-08-24T12:00:00.000Z',
        }),
        expect.objectContaining({
          team_id: 'chiefs',
          season: 2025,
          player_id: '4426338',
          updated_at: '2026-08-24T12:00:00.000Z',
        }),
      ])
    );
    expect(result).toMatchObject({ rowsWritten: 2, diagnostics: { summaries: 2 } });
    expect(result.rows).toHaveLength(2);
  });

  it('carries completed transform diagnostics through writer failures', async () => {
    const promise = ingestRecentSnapSeason({
      season: 2025,
      fetchCsv: async () => validCsv,
      pfrToEspn,
      resolveTeam,
      updatedAt: '2026-08-24T12:00:00.000Z',
      upsert: async () => {
        throw new Error('writer unavailable');
      },
    });

    await expect(promise).rejects.toMatchObject({
      message: 'writer unavailable',
      diagnostics: { fetchedRows: 2, validRows: 2, summaries: 2 },
    });
  });

  it('retains diagnostics for a failed season after its transform completes', async () => {
    const result = await ingestRecentSnapSeasons([2025, 2024], (season) =>
      ingestRecentSnapSeason({
        season,
        fetchCsv: async () => validCsv,
        pfrToEspn,
        resolveTeam,
        updatedAt: '2026-08-24T12:00:00.000Z',
        upsert:
          season === 2024
            ? async () => {
                throw new Error('writer unavailable');
              }
            : async () => undefined,
      })
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rowsWritten).toBe(2);
    expect(result.diagnosticsBySeason).toEqual({
      2024: expect.objectContaining({ fetchedRows: 2, validRows: 2, summaries: 2 }),
      2025: expect.objectContaining({ fetchedRows: 2, validRows: 2, summaries: 2 }),
    });
    expect(result.failures).toEqual([{ season: 2024, message: 'writer unavailable' }]);
  });
});
