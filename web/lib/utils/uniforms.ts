import type { Uniform } from '@/lib/types';

// The year range shown under a kit's name in the selector. Every curated kit has a
// concrete start year; an open end means the era is still current. Pure so it's cheap
// to unit-test.
export function formatUniformYears(u: Uniform): string {
  if (u.yearEnd === null) return `${u.yearStart}–present`;
  if (u.yearStart === u.yearEnd) return `${u.yearStart}`;
  return `${u.yearStart}–${u.yearEnd}`;
}
