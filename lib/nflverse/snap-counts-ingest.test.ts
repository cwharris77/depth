import { describe, expect, it, vi } from 'vitest';
import { ingestRecentSnapSeason } from './snap-counts-ingest';

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
    await expect(
      ingestRecentSnapSeason({
        season: 2025,
        fetchCsv: async () => {
          throw new Error('source unavailable');
        },
        pfrToEspn,
        resolveTeam,
        updatedAt: '2026-08-24T12:00:00.000Z',
        upsert,
      })
    ).rejects.toThrow('source unavailable');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a malformed transform without calling the writer', async () => {
    const upsert = vi.fn();
    await expect(
      ingestRecentSnapSeason({
        season: 2025,
        fetchCsv: async () =>
          'game_id,season,game_type,week,pfr_player_id,team,offense_snaps\n,2025,REG,1,,KC,-1',
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
});
