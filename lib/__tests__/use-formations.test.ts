import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormations } from '@/lib/hooks/depth-chart/use-formations';
import type { TeamFormation } from '@/lib/types';

const formations: TeamFormation[] = [
  { season: 2025, rank: 2, unit: 'offense', alignment: 'shotgun', personnel: '11', pct: 40 },
  { season: 2025, rank: 1, unit: 'offense', alignment: 'shotgun', personnel: '12', pct: 55 },
  { season: 2025, rank: 1, unit: 'defense', alignment: 'Nickel', personnel: '424', pct: 60 },
];

describe('useFormations', () => {
  it("defaults to the unit's top-ranked formation", () => {
    const { result } = renderHook(() => useFormations('SEA', 'offense', formations, false));
    expect(result.current.activeFormation?.personnel).toBe('12');
    expect(result.current.unitFormations).toHaveLength(2);
  });

  it('falls back to Base when the unit has no real formations', () => {
    const { result } = renderHook(() => useFormations('SEA', 'special', formations, false));
    expect(result.current.activeFormation).toBeNull();
    expect(result.current.formationsMeta).toBe('Base');
  });

  it("resetToTopForUnit switches the active pick to the new unit's top formation", () => {
    const { result } = renderHook(() => useFormations('SEA', 'offense', formations, false));
    act(() => result.current.resetToTopForUnit('defense'));
    expect(result.current.activeFormation?.alignment).toBe('Nickel');
  });

  it("resets to the new team's top formation on team change", () => {
    const otherTeamFormations: TeamFormation[] = [
      { season: 2025, rank: 1, unit: 'offense', alignment: 'gun', personnel: '21', pct: 30 },
    ];
    const { result, rerender } = renderHook(
      ({ teamId, formations }) => useFormations(teamId, 'offense', formations, false),
      { initialProps: { teamId: 'SEA', formations } }
    );
    expect(result.current.activeFormation?.personnel).toBe('12');

    rerender({ teamId: 'DAL', formations: otherTeamFormations });
    expect(result.current.activeFormation?.personnel).toBe('21');
  });

  it('realFormation is undefined in historical mode', () => {
    const { result } = renderHook(() => useFormations('SEA', 'offense', formations, true));
    expect(result.current.realFormation).toBeUndefined();
  });

  it('realFormation is defined outside historical mode when a formation is active', () => {
    const { result } = renderHook(() => useFormations('SEA', 'offense', formations, false));
    expect(result.current.realFormation).toBeDefined();
  });
});
