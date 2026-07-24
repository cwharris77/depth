// Persists the user's selected uniform kit per team to localStorage (roadmap Phase 7).
// Kit choice is ephemeral across page navigations because DepthChartField unmounts on
// route change (ROSTER/STATS/SCHEDULE are separate routes, not client tabs). This module
// mirrors the shape and pattern of lib/depth-overrides.ts's STORAGE_KEY/Store pattern:
// a Record<teamId, kitId> under its own key. localStorage only for now (single device,
// no accounts); a real backend comes with auth later.

const STORAGE_KEY = 'depth:kit';
type Store = Record<string, string>; // teamId -> kitId

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore (private mode / quota)
  }
}

/** Read the persisted kit id for a team, or undefined if none is stored. */
export function getKitId(teamId: string): string | undefined {
  return readStore()[teamId];
}

/** Persist the selected kit id for a team. */
export function setKitId(teamId: string, kitId: string): void {
  const store = readStore();
  writeStore({ ...store, [teamId]: kitId });
}

/** Remove the persisted kit selection for a team (reset to default). */
export function clearKitId(teamId: string): void {
  const store = readStore();
  if (store[teamId]) {
    const { [teamId]: _removed, ...rest } = store;
    writeStore(rest);
  }
}
