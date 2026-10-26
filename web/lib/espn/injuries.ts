// ESPN's injury designations, keyed by their lowercased label. Ordered from most to
// least severe, which `injuryDesignation` relies on to pick one label per athlete.
export const INJURIES = new Map(
  [
    'Injured Reserve',
    'Physically Unable to Perform',
    'Non-Football Injury',
    'Out',
    'Doubtful',
    'Questionable',
    'Probable',
  ].map((label) => [label.toLowerCase(), label])
);

const SEVERITY = [...INJURIES.values()];

// The single designation shown for an athlete: the most severe known label in ESPN's
// `injuries` collection. Undefined when the collection is empty or holds only labels this
// build does not know, so the caller falls back to the plain injured status.
export function injuryDesignation(injuries: { status?: string }[] | undefined): string | undefined {
  const labels = (injuries ?? []).flatMap((injury) => {
    const label =
      typeof injury?.status === 'string'
        ? INJURIES.get(injury.status.trim().toLowerCase())
        : undefined;
    return label ? [label] : [];
  });
  return labels.sort((a, b) => SEVERITY.indexOf(a) - SEVERITY.indexOf(b))[0];
}
