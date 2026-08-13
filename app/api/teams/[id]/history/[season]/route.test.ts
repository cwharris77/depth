import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import { getTeamSeason } from '@/lib/roster-source.db';

vi.mock('@/lib/roster-source.db', () => ({
  getTeamSeason: vi.fn(),
}));

const get = (id: string, season: string) =>
  GET(new Request('http://localhost'), { params: Promise.resolve({ id, season }) });

beforeEach(() => vi.resetAllMocks());

describe('GET /api/teams/[id]/history/[season]', () => {
  it('404s a malformed season', async () => {
    const res = await get('seahawks', 'not-a-season');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'invalid season' });
  });

  it('404s an out-of-range season', async () => {
    const res = await get('seahawks', '1950');
    expect(res.status).toBe(404);
  });

  it('404s a missing id instead of querying', async () => {
    const res = await get('', '2013');
    expect(res.status).toBe(404);
    expect(getTeamSeason).not.toHaveBeenCalled();
  });

  it('500s with JSON when the query throws, not an unhandled error', async () => {
    vi.mocked(getTeamSeason).mockRejectedValue(new Error('db down'));
    const res = await get('seahawks', '2013');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read failed' });
  });

  it('404s when the season has no ingested roster', async () => {
    vi.mocked(getTeamSeason).mockResolvedValue(undefined);
    const res = await get('seahawks', '2013');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  it('returns the roster on success', async () => {
    const roster = { team: { id: 'seahawks' }, players: [] };
    vi.mocked(getTeamSeason).mockResolvedValue(roster as never);
    const res = await get('seahawks', '2013');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ roster });
  });
});
