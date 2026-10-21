import { describe, expect, it } from 'vitest';
import { injuryDesignation } from './injuries';

describe('injuryDesignation', () => {
  it('normalizes the label ESPN sends', () => {
    expect(injuryDesignation([{ status: ' questionable ' }])).toBe('Questionable');
  });

  it('picks the most severe of several entries', () => {
    expect(
      injuryDesignation([
        { status: 'Questionable' },
        { status: 'Injured Reserve' },
        { status: 'Out' },
      ])
    ).toBe('Injured Reserve');
  });

  it('skips labels it does not know', () => {
    expect(injuryDesignation([{ status: 'Day-To-Day' }, { status: 'Doubtful' }])).toBe('Doubtful');
  });

  it('is undefined for no injuries, unknown labels or malformed entries', () => {
    expect(injuryDesignation(undefined)).toBeUndefined();
    expect(injuryDesignation([])).toBeUndefined();
    expect(injuryDesignation([{ status: 'Day-To-Day' }])).toBeUndefined();
    expect(injuryDesignation([{}, { status: 7 as unknown as string }])).toBeUndefined();
  });
});
