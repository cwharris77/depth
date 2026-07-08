import { describe, it, expect } from 'vitest';
import { decideReconcile, type PendingHome } from '../uniforms/reconcile';
import type { TeamColors } from '../types';

function colors(primary: string, secondary: string): TeamColors {
  return { primary, secondary, accent: '#cccccc', uiAccent: '#69BE28', onAccent: '#0a0e1a' };
}

const AWAY_RUN = '2027-W10';
const NEXT_RUN = '2027-W11';

function decide(over: Partial<Parameters<typeof decideReconcile>[0]> = {}) {
  return decideReconcile({
    espn: colors('#0b1b2c', '#69be28'),
    home: colors('#002244', '#69BE28'),
    pending: null,
    runId: AWAY_RUN,
    seasonYear: 2027,
    isLegible: true,
    ...over,
  });
}

describe('decideReconcile', () => {
  it('bootstraps a team with no home row', () => {
    expect(decide({ home: null })).toEqual({ action: 'bootstrap' });
  });

  it('no-ops when colors are unchanged and nothing is pending', () => {
    expect(decide({ espn: colors('#002244', '#69BE28') })).toEqual({ action: 'noop' });
  });

  it('compares colors case-insensitively (no false change)', () => {
    expect(decide({ espn: colors('#002244', '#69be28') })).toEqual({ action: 'noop' });
  });

  it('clears a stale candidate when ESPN reverts to the live home (revert path)', () => {
    const pending: PendingHome = { primary: '#0b1b2c', secondary: '#69be28', runId: AWAY_RUN };
    expect(decide({ espn: colors('#002244', '#69BE28'), pending })).toEqual({
      action: 'clear-pending',
    });
  });

  it('holds on a #000000 fallback sentinel', () => {
    expect(decide({ espn: colors('#000000', '#69be28') })).toEqual({
      action: 'hold',
      reason: 'fallback',
    });
  });

  it('holds on a #ffffff fallback sentinel', () => {
    expect(decide({ espn: colors('#0b1b2c', '#ffffff') })).toEqual({
      action: 'hold',
      reason: 'fallback',
    });
  });

  it('holds when the new accent is illegible on the dark UI', () => {
    expect(decide({ isLegible: false })).toEqual({ action: 'hold', reason: 'contrast' });
  });

  it('stages a first sighting instead of promoting', () => {
    expect(decide()).toEqual({
      action: 'stage',
      pending: { primary: '#0b1b2c', secondary: '#69be28', runId: AWAY_RUN },
    });
  });

  it('promotes when the same candidate is confirmed by a second, distinct pull', () => {
    const pending: PendingHome = { primary: '#0b1b2c', secondary: '#69be28', runId: AWAY_RUN };
    expect(decide({ pending, runId: NEXT_RUN })).toEqual({ action: 'promote', retiredYear: 2027 });
  });

  it('does NOT promote on a same-week retry (same runId) — re-stages instead', () => {
    const pending: PendingHome = { primary: '#0b1b2c', secondary: '#69be28', runId: AWAY_RUN };
    expect(decide({ pending, runId: AWAY_RUN })).toEqual({
      action: 'stage',
      pending: { primary: '#0b1b2c', secondary: '#69be28', runId: AWAY_RUN },
    });
  });

  it('re-stages a different candidate rather than promoting the old one', () => {
    const pending: PendingHome = { primary: '#111111', secondary: '#222222', runId: AWAY_RUN };
    expect(decide({ pending, runId: NEXT_RUN })).toEqual({
      action: 'stage',
      pending: { primary: '#0b1b2c', secondary: '#69be28', runId: NEXT_RUN },
    });
  });

  it('oscillation A->B->A->B never promotes early; needs two consecutive B pulls', () => {
    const home = colors('#002244', '#69BE28'); // A
    const B = colors('#0b1b2c', '#69be28');
    // week 1: first B -> stage
    const w1 = decide({ home, espn: B, pending: null, runId: '2027-W1' });
    expect(w1).toEqual({
      action: 'stage',
      pending: { primary: '#0b1b2c', secondary: '#69be28', runId: '2027-W1' },
    });
    // week 2: back to A -> clear the B candidate
    const w2 = decide({
      home,
      espn: home,
      pending: { primary: '#0b1b2c', secondary: '#69be28', runId: '2027-W1' },
      runId: '2027-W2',
    });
    expect(w2).toEqual({ action: 'clear-pending' });
    // week 3: B again, but pending was cleared -> stage, still no promote
    const w3 = decide({ home, espn: B, pending: null, runId: '2027-W3' });
    expect(w3.action).toBe('stage');
    // week 4: B confirmed by a distinct pull -> promote
    const w4 = decide({
      home,
      espn: B,
      pending: { primary: '#0b1b2c', secondary: '#69be28', runId: '2027-W3' },
      runId: '2027-W4',
    });
    expect(w4).toEqual({ action: 'promote', retiredYear: 2027 });
  });
});
