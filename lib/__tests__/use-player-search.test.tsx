import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
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
});
