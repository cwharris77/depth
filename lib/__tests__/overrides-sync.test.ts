import { describe, it, expect } from 'vitest';
import { planMerge } from '../overrides-sync';

// planMerge is the whole risk surface of the sign-in reconcile: everything else is fetch
// glue. The rule is server-wins per team, local-only teams push up, empty produces no work.
describe('planMerge', () => {
  it('pushes a team that exists only locally', () => {
    const plan = planMerge({ seahawks: { QB: ['a', 'b'] } }, {});
    expect(plan.pushes).toEqual(['seahawks']);
    expect(plan.pulls).toEqual({});
  });

  it('pulls a team that exists only on the server', () => {
    const plan = planMerge({}, { eagles: { RB: ['x'] } });
    expect(plan.pushes).toEqual([]);
    expect(plan.pulls).toEqual({ eagles: { RB: ['x'] } });
  });

  it('server wins when a team exists on both sides', () => {
    const plan = planMerge({ eagles: { RB: ['local'] } }, { eagles: { RB: ['server'] } });
    expect(plan.pushes).toEqual([]); // not pushed -- server already has it
    expect(plan.pulls).toEqual({ eagles: { RB: ['server'] } }); // overwrites local
  });

  it('does nothing when both sides are empty', () => {
    expect(planMerge({}, {})).toEqual({ pushes: [], pulls: {} });
  });

  it('ignores an empty local override (a cleared team is not pushed)', () => {
    const plan = planMerge({ seahawks: {} }, {});
    expect(plan.pushes).toEqual([]);
    expect(plan.pulls).toEqual({});
  });

  it('ignores an empty server override', () => {
    const plan = planMerge({}, { eagles: {} });
    expect(plan.pulls).toEqual({});
  });

  it('handles pushes and pulls together', () => {
    const plan = planMerge(
      { seahawks: { QB: ['a'] }, eagles: { RB: ['local'] } },
      { eagles: { RB: ['server'] }, niners: { WR: ['z'] } }
    );
    expect(plan.pushes).toEqual(['seahawks']); // local-only
    expect(plan.pulls).toEqual({
      eagles: { RB: ['server'] }, // server wins over local
      niners: { WR: ['z'] }, // server-only
    });
  });
});
