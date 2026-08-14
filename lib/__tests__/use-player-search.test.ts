import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerSearch } from '@/lib/hooks/search/use-player-search';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

function makeResponse(body: unknown): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('usePlayerSearch', () => {
  it('returns error on network failure (not empty results)', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePlayerSearch('geno'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.results).toEqual([]);
  });

  it('returns empty results on successful search with no matches (not error)', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ results: [] }));

    const { result } = renderHook(() => usePlayerSearch('nonexistent'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([]);
  });

  it('returns results on successful search', async () => {
    vi.useFakeTimers();
    const mockHits = [
      {
        id: 'p1',
        name: 'Geno Smith',
        position: 'QB',
        number: 7,
        team: {
          id: 'SEA',
          name: 'Seahawks',
          city: 'Seattle',
          abbreviation: 'SEA',
          conference: 'NFC',
          division: 'West',
          colors: { primary: '#002244', secondary: '#69BE28', uiAccent: '#69BE28' },
          logo: '',
        },
        photoUrl: null,
      },
    ];
    global.fetch = vi.fn().mockResolvedValue(makeResponse({ results: mockHits }));

    const { result } = renderHook(() => usePlayerSearch('geno'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual(mockHits);
  });

  it('does not set error on abort', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const { result } = renderHook(() => usePlayerSearch('geno'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.error).toBeNull();
  });

  it('returns idle state when query is empty', () => {
    const { result } = renderHook(() => usePlayerSearch(''));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([]);
  });

  it('does not fetch when enabled is false', () => {
    global.fetch = vi.fn();

    const { result } = renderHook(() => usePlayerSearch('geno', { enabled: false }));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
