// Small display formatters for player vitals. Kept pure and separate from the card
// component so the wording is unit-tested rather than buried in JSX.

// Years of NFL experience as a fan-facing label: 0 seasons is a rookie, otherwise
// singular/plural years. Guards against negative/NaN source data by treating
// anything <= 0 as a rookie.
export function experienceLabel(experience: number): string {
  if (!Number.isFinite(experience) || experience <= 0) return 'Rookie';
  return experience === 1 ? '1 yr' : `${experience} yrs`;
}
