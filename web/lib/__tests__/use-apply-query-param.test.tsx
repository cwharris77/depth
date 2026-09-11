import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApplyQueryParam } from '@/lib/hooks/use-apply-query-param';

// Mutable module-scoped stand-ins for next/navigation's hooks, reassigned per test to
// simulate a URL/route change without a real Next.js router (DEP-184).
let mockParams = new URLSearchParams();
let mockPathname = '/team/sea';
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockParams,
  usePathname: () => mockPathname,
  useRouter: () => ({ replace }),
}));

function Harness({
  paramKey,
  apply,
  strip,
}: {
  paramKey: string;
  apply: (value: string | null) => void;
  strip?: boolean;
}) {
  useApplyQueryParam(paramKey, apply, strip === undefined ? undefined : { strip });
  return null;
}

beforeEach(() => {
  replace.mockClear();
  mockParams = new URLSearchParams();
  mockPathname = '/team/sea';
});

afterEach(() => {
  cleanup();
});

describe('useApplyQueryParam', () => {
  it('applies a present value once and strips the URL by default (one-shot mode)', () => {
    mockParams = new URLSearchParams('kit=away');
    const apply = vi.fn();
    render(<Harness paramKey="kit" apply={apply} />);
    expect(apply).toHaveBeenCalledWith('away');
    expect(replace).toHaveBeenCalledWith('/team/sea', { scroll: false });
  });

  it('does nothing when the param is absent (default strip mode)', () => {
    const apply = vi.fn();
    render(<Harness paramKey="kit" apply={apply} />);
    expect(apply).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('with strip:false, applies without stripping the URL', () => {
    mockParams = new URLSearchParams('season=2019');
    const apply = vi.fn();
    render(<Harness paramKey="season" apply={apply} strip={false} />);
    expect(apply).toHaveBeenCalledWith('2019');
    expect(replace).not.toHaveBeenCalled();
  });

  it('with strip:false, notifies apply(null) when the param is removed', () => {
    mockParams = new URLSearchParams('season=2019');
    const apply = vi.fn();
    const { rerender } = render(<Harness paramKey="season" apply={apply} strip={false} />);
    expect(apply).toHaveBeenLastCalledWith('2019');

    mockParams = new URLSearchParams();
    act(() => {
      rerender(<Harness paramKey="season" apply={apply} strip={false} />);
    });
    expect(apply).toHaveBeenLastCalledWith(null);
  });

  it('with strip:false, re-applies on a pathname change even when the raw value is unchanged', () => {
    // Mirrors a team switch that lands on the same ?season= value the previous team's
    // page happened to carry -- the raw value alone gives the effect nothing to react to.
    mockParams = new URLSearchParams('season=2019');
    const apply = vi.fn();
    const { rerender } = render(<Harness paramKey="season" apply={apply} strip={false} />);
    expect(apply).toHaveBeenCalledTimes(1);

    mockPathname = '/team/den';
    act(() => {
      rerender(<Harness paramKey="season" apply={apply} strip={false} />);
    });
    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenLastCalledWith('2019');
  });

  it('calls the latest apply callback even when it is a new function identity every render', () => {
    // None of this hook's current callers memoize `apply` -- this guards the ref-based fix
    // (DEP-184 finding #2) so a fresh closure per render still fires with the current URL
    // once the effect's real dependencies (the param value) actually change.
    let renderCount = 0;
    const seen: (string | null)[] = [];
    function UnstableHarness() {
      renderCount++;
      const label = renderCount;
      useApplyQueryParam('kit', (value) => seen.push(`${label}:${value}`));
      return null;
    }

    const { rerender } = render(<UnstableHarness />);
    rerender(<UnstableHarness />);
    rerender(<UnstableHarness />);
    expect(seen).toEqual([]);

    mockParams = new URLSearchParams('kit=away');
    act(() => {
      rerender(<UnstableHarness />);
    });
    expect(seen).toEqual([`${renderCount}:away`]);
  });
});
