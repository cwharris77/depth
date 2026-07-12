// Small display formatters for player vitals. Kept pure and separate from the card
// component so the wording is unit-tested rather than buried in JSX.

// Years of NFL experience as a fan-facing label: 0 seasons is a rookie, otherwise
// singular/plural years. Guards against negative/NaN source data by treating
// anything <= 0 as a rookie.
export function experienceLabel(experience: number): string {
  if (!Number.isFinite(experience) || experience <= 0) return 'Rookie';
  return experience === 1 ? '1 yr' : `${experience} yrs`;
}

// English ordinal suffix (1st/2nd/3rd/4th...). The 11-13 teens are an exception to the
// mod-10 rule (11th, not 11st), so they're checked before the mod-10 switch.
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
