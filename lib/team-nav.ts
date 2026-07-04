// Step to the previous/next team in a fixed ordering, wrapping around the ends so
// the header's prev/next arrows cycle through the whole league. Takes the ordered id
// list (the app hands it the same stable order dbRosterSource.listTeams returns).
// Returns null when the current id isn't in the list (nothing sensible to step from).
export function adjacentTeamId(
  orderedIds: readonly string[],
  currentId: string,
  dir: "prev" | "next",
): string | null {
  const i = orderedIds.indexOf(currentId);
  if (i === -1) return null;
  const n = orderedIds.length;
  const next = dir === "next" ? (i + 1) % n : (i - 1 + n) % n;
  return orderedIds[next];
}
