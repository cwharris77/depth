import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDepthChartSeason } from '../use-depth-chart-season';

const mockTeam = { id: 'SEA', city: 'Seattle', name: 'Seahawks' };

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

describe('useDepthChartSeason', () => {
  it('starts on the live roster (season: null, not historical)', () => {
    const { result } = renderHook(() => useDepthChartSeason(mockTeam));
    expect(result.current.season).toBeNull();
    expect(result.current.historicalMode).toBe(false);
    expect(result.current.historicalRoster).toBeNull();
  });

  it('setSeason switches into historical mode and fetches that season', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse(false, 404));
    const { result } = renderHook(() => useDepthChartSeason(mockTeam));

    act(() => result.current.setSeason(2022));
    expect(result.current.season).toBe(2022);
    expect(result.current.historicalMode).toBe(true);

    await act(async () => {
      await flushPromises();
    });
    expect(result.current.historyNotFound).toBe(true);
  });

  it('resets to the live roster when the team changes', () => {
    const { result, rerender } = renderHook(({ team }) => useDepthChartSeason(team), {
      initialProps: { team: mockTeam },
    });

    act(() => result.current.setSeason(2022));
    expect(result.current.historicalMode).toBe(true);

    rerender({ team: { id: 'DAL', city: 'Dallas', name: 'Cowboys' } });
    expect(result.current.season).toBeNull();
    expect(result.current.historicalMode).toBe(false);
  });

  it('retry re-fetches the same season', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(
        makeResponse(true, 200, {
          roster: {
            team: {
              id: mockTeam.id,
              name: mockTeam.name,
              city: mockTeam.city,
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

    const { result } = renderHook(() => useDepthChartSeason(mockTeam));
    act(() => result.current.setSeason(2022));

    await act(async () => {
      await flushPromises();
    });
    expect(result.current.historyError).toBeInstanceOf(Error);

    act(() => result.current.retry());

    await act(async () => {
      await flushPromises();
    });
    expect(result.current.historyError).toBeNull();
    expect(result.current.historicalRoster).not.toBeNull();
  });

  it('handleShareHistoricalRoster copies the URL to the clipboard when navigator.share is unavailable', async () => {
    global.fetch = vi.fn().mockResolvedValue(makeResponse(false, 404));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useDepthChartSeason(mockTeam));
    act(() => result.current.setSeason(2022));

    await act(async () => {
      await result.current.handleShareHistoricalRoster();
    });

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(result.current.historicalShareCopied).toBe(true);
  });
});
