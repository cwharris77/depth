import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { usePlayerSearch } from '../use-player-search';

const mockFetch = vi.fn();

function SearchComponent({ query }: { query: string }) {
  const { results, loading } = usePlayerSearch(query);
  return (
    <div>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <span data-testid="count">{results.length}</span>
    </div>
  );
}

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ results: [] }),
  });
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mockFetch.mockReset();
});

describe('usePlayerSearch debounce', () => {
  it('delays a request by 200ms when query changes from one non-empty value to another', () => {
    const { rerender } = render(<SearchComponent query="J" />);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockClear();

    rerender(<SearchComponent query="Ja" />);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(mockFetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('a burst of keystrokes yields one request after the pause', () => {
    const { rerender } = render(<SearchComponent query="" />);

    rerender(<SearchComponent query="J" />);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    mockFetch.mockClear();

    rerender(<SearchComponent query="Ja" />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockFetch).not.toHaveBeenCalled();

    rerender(<SearchComponent query="Jam" />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockFetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not fire a request for an empty query', () => {
    render(<SearchComponent query="" />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("a superseded in-flight request does not clobber the newer request's loading state", async () => {
    let rejectFirst: (e: unknown) => void = () => {};
    const firstFetch = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });
    mockFetch
      .mockImplementationOnce((_url: string, opts: { signal: AbortSignal }) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          rejectFirst(err);
        });
        return firstFetch;
      })
      .mockImplementationOnce(() => new Promise(() => {})); // second fetch stays pending

    const { rerender, getByTestId } = render(<SearchComponent query="" />);
    rerender(<SearchComponent query="Zz" />);
    await act(async () => {
      vi.advanceTimersByTime(1); // immediate (0ms) delay, fires fetch #1 -- left pending
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(getByTestId('loading').textContent).toBe('true');

    // Second keystroke arrives while the first fetch is still in flight -- its cleanup
    // aborts fetch #1 (rejecting it), and the new effect fires fetch #2 once its 200ms
    // debounce elapses.
    rerender(<SearchComponent query="Zzz" />);
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve(); // flush the aborted fetch #1's rejection microtasks
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Fetch #2 is still pending -- loading must still read true, not be clobbered false
    // by fetch #1's aborted rejection settling after fetch #2's setLoading(true) ran.
    expect(getByTestId('loading').textContent).toBe('true');
  });
});
