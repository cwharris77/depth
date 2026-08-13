import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamSeason } from '../use-team-season';

const mockTeamId = 'SEA';
const mockSeason = 2025;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

function makeResponse(ok: boolean, status = 200, body?: unknown): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('useTeamSeason', () => {
  it('returns notFound=true when the API returns 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse(false, 404));

    const { result } = renderHook(() => useTeamSeason(mockTeamId, mockSeason));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.historyNotFound).toBe(true);
    expect(result.current.historyError).toBeNull();
  });

  it('returns error on network failure (not notFound)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTeamSeason(mockTeamId, mockSeason));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.historyError).toBeInstanceOf(Error);
    expect(result.current.historyNotFound).toBe(false);
  });

  it('returns error on 500 response (not notFound)', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse(false, 500));

    const { result } = renderHook(() => useTeamSeason(mockTeamId, mockSeason));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.historyError).toBeInstanceOf(Error);
    expect(result.current.historyNotFound).toBe(false);
  });

  it('returns roster data on success', async () => {
    const mockRoster = {
      team: {
        id: mockTeamId,
        name: 'Seattle',
        city: 'Seattle',
        abbreviation: 'SEA',
        conference: 'NFC',
        division: 'West',
        colors: { primary: '#002244', secondary: '#69BE28', uiAccent: '#69BE28' },
        logo: '',
      },
      players: [],
    };
    global.fetch = vi.fn().mockResolvedValue(makeResponse(true, 200, { roster: mockRoster }));

    const { result } = renderHook(() => useTeamSeason(mockTeamId, mockSeason));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.historyNotFound).toBe(false);
    expect(result.current.historyError).toBeNull();
    expect(result.current.historicalRoster).toEqual(mockRoster);
  });

  it('stays idle when season is null', () => {
    const { result } = renderHook(() => useTeamSeason(mockTeamId, null));

    expect(result.current.historyLoading).toBe(false);
    expect(result.current.historyNotFound).toBe(false);
    expect(result.current.historyError).toBeNull();
    expect(result.current.historicalRoster).toBeNull();
  });

  it('does not set notFound or error on abort', async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const { result } = renderHook(() => useTeamSeason(mockTeamId, mockSeason));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.historyNotFound).toBe(false);
    expect(result.current.historyError).toBeNull();
  });

  it('retries when retry counter changes', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(
        makeResponse(true, 200, {
          roster: {
            team: {
              id: mockTeamId,
              name: 'Seattle',
              city: 'Seattle',
              abbreviation: 'SEA',
              conference: 'NFC',
              division: 'West',
              colors: { primary: '#002244', secondary: '#69BE28', uiAccent: '#69BE28' },
              logo: '',
            },
            players: [],
          },
        })
      );
    global.fetch = fetchFn;

    const { result, rerender } = renderHook(
      ({ retry }) => useTeamSeason(mockTeamId, mockSeason, retry),
      { initialProps: { retry: 0 } }
    );

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.historyError).toBeInstanceOf(Error);

    rerender({ retry: 1 });

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.historyError).toBeNull();
    expect(result.current.historyNotFound).toBe(false);
    expect(result.current.historicalRoster).not.toBeNull();
  });
});
