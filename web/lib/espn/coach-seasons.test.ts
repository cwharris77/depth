import { describe, it, expect } from 'vitest';
import { coachSeasonExperience, priorCoachSeason, type CoachSeasonRow } from './coach-seasons';

function row(over: Partial<CoachSeasonRow>): CoachSeasonRow {
  return { season: 2025, coach_name: 'Sean McDermott', coach_experience: 9, ...over };
}

describe('coachSeasonExperience', () => {
  it('advances a continuing coach by one season', () => {
    expect(coachSeasonExperience('Sean McDermott', row({}))).toBe(9 + 1);
  });

  it('starts a new hire at their 1st season with the team', () => {
    // The real 2026 Bills case: Joe Brady replacing McDermott reads "1ST
    // SEASON", never McDermott's count and never ESPN's career number.
    expect(coachSeasonExperience('Joe Brady', row({}))).toBe(1);
  });

  it('starts an in-season interim at 1 rather than inheriting the fired coach', () => {
    expect(coachSeasonExperience('Interim Guy', row({ season: 2026, coach_experience: 1 }))).toBe(
      1
    );
  });
});

describe('priorCoachSeason', () => {
  const rows = [
    row({ season: 2023, coach_experience: 7 }),
    row({ season: 2025, coach_experience: 9 }),
    row({ season: 2024, coach_experience: 8 }),
  ];

  it('picks the newest season strictly before the one being written', () => {
    expect(priorCoachSeason(rows, 2026)?.season).toBe(2025);
  });

  it('ignores a row for the season being written, so re-runs are idempotent', () => {
    // Without the strict `<`, a second ingest on the same day would read back the row
    // it just wrote and increment again -- 1st season, then 2nd, then 3rd.
    const withCurrent = [
      ...rows,
      row({ season: 2026, coach_name: 'Joe Brady', coach_experience: 1 }),
    ];
    expect(priorCoachSeason(withCurrent, 2026)?.season).toBe(2025);
    expect(coachSeasonExperience('Joe Brady', priorCoachSeason(withCurrent, 2026)!)).toBe(1);
  });

  it('returns null when the team has no history, so the caller can refuse to guess', () => {
    expect(priorCoachSeason([], 2026)).toBeNull();
    expect(priorCoachSeason(rows, 2023)).toBeNull();
  });
});
