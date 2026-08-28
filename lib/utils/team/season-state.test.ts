import { describe, it, expect } from 'vitest';
import { currentSeasonOf, nflSeasonState } from './season-state';

// Pins the canonical season-state definition across the calendar year, mirroring the
// Swift twin (ios/Depth/Data/TeamStatsMapper.swift:181 nflSeasonState) — the two must
// never drift. Month is 0-indexed (0 = Jan, 11 = Dec).
describe('nflSeasonState (canonical "which season is current" definition)', () => {
  it('treats January as the tail of the prior season (postseason still wrapping up)', () => {
    expect(nflSeasonState(new Date(2026, 0, 15))).toEqual({
      completedSeason: 2025,
      upcomingSeason: 2026,
      isOffseason: false,
    });
  });

  it('treats February through August as the off-season (upcoming = this calendar year)', () => {
    expect(nflSeasonState(new Date(2026, 7, 15))).toEqual({
      completedSeason: 2025,
      upcomingSeason: 2026,
      isOffseason: true,
    });
  });

  it('treats September through December as the regular season of this calendar year', () => {
    expect(nflSeasonState(new Date(2026, 8, 15))).toEqual({
      completedSeason: 2025,
      upcomingSeason: 2027,
      isOffseason: false,
    });
  });
});

describe('currentSeasonOf', () => {
  it('is the upcoming season during the off-season', () => {
    expect(
      currentSeasonOf(nflSeasonState(new Date(2026, 7, 15))) // Aug 2026
    ).toBe(2026);
  });

  it('is the season being played right now in-season', () => {
    expect(
      currentSeasonOf(nflSeasonState(new Date(2026, 8, 15))) // Sep 2026
    ).toBe(2026);
  });

  it('in January is the season whose postseason is wrapping up', () => {
    expect(
      currentSeasonOf(nflSeasonState(new Date(2026, 0, 15))) // Jan 2026
    ).toBe(2025);
  });
});
