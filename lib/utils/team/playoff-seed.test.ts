import { describe, it, expect } from 'vitest';
import { displayStreak, isPlayoffSeed, playoffSpotsPerConference } from './playoff-seed';

describe('playoffSpotsPerConference', () => {
  it('is seven from 2020, six before — the field expanded that year', () => {
    expect(playoffSpotsPerConference(2019)).toBe(6);
    expect(playoffSpotsPerConference(2020)).toBe(7);
    expect(playoffSpotsPerConference(2025)).toBe(7);
    // team_stats reaches back to 2002, so the six-team era is most of the history.
    expect(playoffSpotsPerConference(2002)).toBe(6);
  });
});

describe('isPlayoffSeed', () => {
  it('accepts a real seed and rejects a standings position outside the bracket', () => {
    expect(isPlayoffSeed(1, 2025)).toBe(true);
    expect(isPlayoffSeed(7, 2025)).toBe(true);
    expect(isPlayoffSeed(8, 2025)).toBe(false);
    // The shipped bug: a 5-12 Browns team sat 13th in the AFC and rendered "SEED 13".
    expect(isPlayoffSeed(13, 2025)).toBe(false);
  });

  it('respects the pre-2020 six-team field', () => {
    expect(isPlayoffSeed(6, 2019)).toBe(true);
    // Seventh in 2019 missed; the same position in 2020 did not.
    expect(isPlayoffSeed(7, 2019)).toBe(false);
    expect(isPlayoffSeed(7, 2020)).toBe(true);
  });

  it('treats an absent or zero seed as not a seed', () => {
    expect(isPlayoffSeed(undefined, 2025)).toBe(false);
    expect(isPlayoffSeed(null, 2025)).toBe(false);
    expect(isPlayoffSeed(0, 2025)).toBe(false);
    expect(isPlayoffSeed(-1, 2025)).toBe(false);
  });
});

describe('displayStreak', () => {
  it('keeps a real streak', () => {
    expect(displayStreak('W3')).toBe('W3');
    expect(displayStreak('L1')).toBe('L1');
  });

  it('drops ESPN’s no-streak placeholders instead of printing a stray dash', () => {
    expect(displayStreak('-')).toBeUndefined();
    expect(displayStreak(' - ')).toBeUndefined();
    expect(displayStreak('')).toBeUndefined();
    expect(displayStreak('   ')).toBeUndefined();
    expect(displayStreak(null)).toBeUndefined();
    expect(displayStreak(undefined)).toBeUndefined();
  });
});
