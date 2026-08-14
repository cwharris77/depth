import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SyncSelectionFromQuery from '@/components/SyncSelectionFromQuery';
import type { Player, Unit } from '@/lib/types';

// Mutable module-scoped stand-ins for next/navigation, reassigned per test to simulate a
// URL change (mount, Back/Forward, or a manual edit) without a real Next.js router
// (DEP-184: all four selection params -- player/unit/season/kit -- read here).
let mockParams = new URLSearchParams();
let mockPathname = '/team/sea';
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockParams,
  usePathname: () => mockPathname,
  useRouter: () => ({ replace }),
}));

const qb: Player = {
  id: 'qb-1',
  name: 'Test QB',
  number: 7,
  position: 'QB',
  depthRank: 1,
  status: 'starter',
  age: 25,
  college: 'State',
  experience: 3,
  height: '6-2',
  weight: 220,
  bio: '',
};

function renderSync(overrides: {
  selectedPlayerId?: string | null;
  onChangeSelection?: (player: Player | null, unit: Unit | null) => void;
  onApplySeason?: (season: number | null) => void;
  onApplyKit?: (id: string) => void;
  validKitIds?: string[];
}) {
  const onChangeSelection = overrides.onChangeSelection ?? vi.fn();
  const onApplySeason = overrides.onApplySeason ?? vi.fn();
  const onApplyKit = overrides.onApplyKit ?? vi.fn();
  const utils = render(
    <SyncSelectionFromQuery
      players={[qb]}
      selectedPlayerId={overrides.selectedPlayerId ?? null}
      onChangeSelection={onChangeSelection}
      onApplySeason={onApplySeason}
      validKitIds={overrides.validKitIds ?? ['sea-home', 'sea-away']}
      onApplyKit={onApplyKit}
    />
  );
  return { ...utils, onChangeSelection, onApplySeason, onApplyKit };
}

beforeEach(() => {
  replace.mockClear();
  mockParams = new URLSearchParams();
  mockPathname = '/team/sea';
});

afterEach(() => {
  cleanup();
});

describe('SyncSelectionFromQuery', () => {
  it('restores a selected player and its unit from ?player=&unit=', () => {
    mockParams = new URLSearchParams('player=qb-1&unit=special');
    const { onChangeSelection } = renderSync({});
    expect(onChangeSelection).toHaveBeenCalledWith(qb, 'special');
  });

  it('falls back to the position-derived unit when ?unit= is missing or invalid', () => {
    mockParams = new URLSearchParams('player=qb-1');
    const { onChangeSelection } = renderSync({});
    expect(onChangeSelection).toHaveBeenCalledWith(qb, 'offense');
  });

  it('clears selection when ?player= is removed', () => {
    mockParams = new URLSearchParams();
    const { onChangeSelection } = renderSync({ selectedPlayerId: 'qb-1' });
    expect(onChangeSelection).toHaveBeenCalledWith(null, null);
  });

  it('does not re-apply a selection this page already committed (loop guard)', () => {
    mockParams = new URLSearchParams('player=qb-1');
    const { onChangeSelection } = renderSync({ selectedPlayerId: 'qb-1' });
    expect(onChangeSelection).not.toHaveBeenCalled();
  });

  it('applies ?season= without stripping the URL, and resets to null when removed', () => {
    mockParams = new URLSearchParams('season=2019');
    const { onApplySeason, rerender, onChangeSelection, onApplyKit } = renderSync({});
    expect(onApplySeason).toHaveBeenCalledWith(2019);
    expect(replace).not.toHaveBeenCalled();

    mockParams = new URLSearchParams();
    act(() => {
      rerender(
        <SyncSelectionFromQuery
          players={[qb]}
          selectedPlayerId={null}
          onChangeSelection={onChangeSelection}
          onApplySeason={onApplySeason}
          validKitIds={['sea-home', 'sea-away']}
          onApplyKit={onApplyKit}
        />
      );
    });
    expect(onApplySeason).toHaveBeenLastCalledWith(null);
  });

  it('applies a valid ?kit= once and strips it from the URL', () => {
    mockParams = new URLSearchParams('kit=sea-away');
    const { onApplyKit } = renderSync({});
    expect(onApplyKit).toHaveBeenCalledWith('sea-away');
    expect(replace).toHaveBeenCalledWith('/team/sea', { scroll: false });
  });

  it('ignores a ?kit= that names no real uniform for this team', () => {
    mockParams = new URLSearchParams('kit=bogus');
    const { onApplyKit } = renderSync({});
    expect(onApplyKit).not.toHaveBeenCalled();
  });

  it('round-trips all four params together on one mount', () => {
    mockParams = new URLSearchParams('player=qb-1&unit=defense&season=2021&kit=sea-home');
    const { onChangeSelection, onApplySeason, onApplyKit } = renderSync({});
    expect(onChangeSelection).toHaveBeenCalledWith(qb, 'defense');
    expect(onApplySeason).toHaveBeenCalledWith(2021);
    expect(onApplyKit).toHaveBeenCalledWith('sea-home');
  });
});
