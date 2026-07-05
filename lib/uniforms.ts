import type { Uniform } from "./types";

// The year range shown under a kit's name in the selector. Home (the synthesized
// current kit) reads "Current"; a reintroduced throwback keeps its historical era even
// though it's active. Pure so it's cheap to unit-test.
export function formatUniformYears(u: Uniform): string {
  if (u.yearStart === null && u.yearEnd === null) return "Current";
  if (u.yearStart === null) return `Through ${u.yearEnd}`;
  if (u.yearEnd === null) return `${u.yearStart}–present`;
  if (u.yearStart === u.yearEnd) return `${u.yearStart}`;
  return `${u.yearStart}–${u.yearEnd}`;
}
