// Custom depth-chart reordering (roadmap Phase C, v0). A user can reorder the players
// within a position; we persist that as an overlay — the chosen order of player ids per
// position, per team — not a full roster copy. localStorage only for now (single device,
// no accounts); a real backend comes with auth later. See [[Decisions]] (base+overlay).

import type { Player, PlayerStatus, Position, TeamRoster } from './types';

// A team's overlay: position -> the user's ordering of player ids at that position.
export type TeamDepthOverride = Partial<Record<Position, string[]>>;

const STORAGE_KEY = 'depth:overrides';
type Store = Record<string, TeamDepthOverride>; // teamId -> override

// --- pure application -------------------------------------------------------------

// Depth drives the label (STARTER/BACKUP), but rookie/injured are player attributes, so
// preserve those and only flip starter<->backup by the new rank.
function statusForRank(prev: PlayerStatus, rank: number): PlayerStatus {
  if (prev === 'injured' || prev === 'rookie') return prev;
  return rank === 1 ? 'starter' : 'backup';
}

// Apply a team's overlay to its roster: within each overridden position, list the players
// in the user's order (unknown/removed ids skipped), then any not-yet-ordered players in
// their default order. Reassigns `order` (full-precision, honored by getPlayersByPosition),
// a capped 1..3 `depthRank` for labels, and a matching status. Untouched positions pass
// through unchanged. Returns a new roster; the input is not mutated.
export function applyTeamOverride(
  roster: TeamRoster,
  override: TeamDepthOverride | undefined
): TeamRoster {
  if (!override || Object.keys(override).length === 0) return roster;

  const byPosition = new Map<Position, Player[]>();
  for (const p of roster.players) {
    const list = byPosition.get(p.position) ?? [];
    list.push(p);
    byPosition.set(p.position, list);
  }

  const players: Player[] = [];
  for (const [position, group] of byPosition) {
    const order = override[position];
    if (!order || order.length === 0) {
      players.push(...group);
      continue;
    }
    const byId = new Map(group.map((p) => [p.id, p]));
    const ordered: Player[] = [];
    for (const id of order) {
      const p = byId.get(id);
      if (p) {
        ordered.push(p);
        byId.delete(id);
      }
    }
    // Players the overlay didn't mention keep their default relative order.
    const leftovers = [...byId.values()].sort(
      (a, b) => a.depthRank - b.depthRank || a.number - b.number
    );
    [...ordered, ...leftovers].forEach((p, i) => {
      players.push({
        ...p,
        order: i,
        depthRank: Math.min(i + 1, 3) as 1 | 2 | 3,
        status: statusForRank(p.status, i + 1),
      });
    });
  }

  return { ...roster, players };
}

// Swap a player one slot up or down within an ordered id list. Returns the same list
// reference (no change) when the move would run off either end.
export function moveInOrder(ids: string[], id: string, dir: 'up' | 'down'): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return ids;
  const to = dir === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

// --- persistence (localStorage, SSR- and private-mode-guarded) --------------------

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

export function getTeamOverride(teamId: string): TeamDepthOverride {
  return readStore()[teamId] ?? {};
}

// The whole local override store (teamId -> override). Used by the sign-in merge
// (lib/overrides-sync) to reconcile every locally-edited team against the server at once.
export function getAllOverrides(): Record<string, TeamDepthOverride> {
  return readStore();
}

export function setPositionOrder(teamId: string, position: Position, ids: string[]): void {
  const store = readStore();
  store[teamId] = { ...store[teamId], [position]: ids };
  writeStore(store);
}

export function clearPositionOrder(teamId: string, position: Position): void {
  const store = readStore();
  const team = store[teamId];
  if (team && team[position]) {
    delete team[position];
    if (Object.keys(team).length === 0) delete store[teamId];
    writeStore(store);
  }
}

export function clearTeamOverride(teamId: string): void {
  const store = readStore();
  if (store[teamId]) {
    delete store[teamId];
    writeStore(store);
  }
}

// Replace a team's whole override at once (used when applying a shared roster link,
// components/ApplySharedOrder). An empty override clears the team's entry entirely so
// hasOverride reads false afterwards.
export function setTeamOverride(teamId: string, override: TeamDepthOverride): void {
  const store = readStore();
  if (Object.keys(override).length === 0) {
    delete store[teamId];
  } else {
    store[teamId] = override;
  }
  writeStore(store);
}

export function hasOverride(override: TeamDepthOverride): boolean {
  return Object.keys(override).length > 0;
}

// One-time discoverability hint for the reorder feature. Defaults to "seen" on the
// server / when storage is blocked so we never flash the hint where we can't dismiss it.
const HINT_KEY = 'depth:seen-reorder-hint';

export function seenReorderHint(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true;
  }
}

export function markReorderHintSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HINT_KEY, '1');
  } catch {
    // ignore
  }
}
