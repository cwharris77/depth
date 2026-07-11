// Cross-device sync for custom depth-chart order (Phase C, override-sync pass --
// docs/superpowers/specs/2026-07-07-phase-c-auth-and-saved-boards-design.md, "Overlay sync").
// localStorage (lib/depth-overrides) stays the always-on cache; when signed in, every local
// write is mirrored to the server (fire-and-forget, last-write-wins), and a one-time merge on
// sign-in reconciles the two. Signed out, none of this runs -- persistence is account-gated.
// The server copy is the durable, cross-device truth.
import { getAllOverrides, setTeamOverride, type TeamDepthOverride } from './depth-overrides';

type OverrideMap = Record<string, TeamDepthOverride>; // teamId -> override

// --- pure merge planning ----------------------------------------------------------

export type MergePlan = {
  pushes: string[]; // teamIds whose local override should be uploaded (server has none yet)
  pulls: OverrideMap; // teamId -> server override to write locally (server wins)
};

// Reconcile the local store against the server's on sign-in. A team edited only locally
// (server has never seen it) is pushed up; any team the server already holds wins and is
// pulled down over the local copy -- it is the durable cross-device truth. Local-empty or
// server-empty teams produce no work. Deterministic, no prompts.
export function planMerge(local: OverrideMap, server: OverrideMap): MergePlan {
  const pushes: string[] = [];
  for (const teamId of Object.keys(local)) {
    if (hasKeys(local[teamId]) && !hasKeys(server[teamId])) pushes.push(teamId);
  }
  const pulls: OverrideMap = {};
  for (const teamId of Object.keys(server)) {
    if (hasKeys(server[teamId])) pulls[teamId] = server[teamId];
  }
  return { pushes, pulls };
}

function hasKeys(override: TeamDepthOverride | undefined): boolean {
  return !!override && Object.keys(override).length > 0;
}

// --- server I/O -------------------------------------------------------------------

// Fire-and-forget upload of one team's override. localStorage already holds the change, so a
// dropped request is not surfaced -- the next edit retries. An empty override tells the PUT
// handler to clear the team's rows (revert to default), matching setTeamOverride's semantics.
export async function pushTeamOverride(teamId: string, override: TeamDepthOverride): Promise<void> {
  try {
    await fetch('/api/overrides', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, override }),
    });
  } catch {
    // fire-and-forget -- ignore (offline / signed out)
  }
}

let merging = false;

// One-time reconcile when auth becomes signed-in: pull the server's overrides (server wins
// per team), push up any team edited only locally, and write the pulled overrides into
// localStorage so the field re-reads them. Guarded so overlapping sign-in signals (getUser +
// onAuthStateChange both firing) never run it concurrently. Idempotent -- a repeat run just
// re-reconciles the same state.
export async function mergeOnSignIn(): Promise<void> {
  if (merging) return;
  merging = true;
  try {
    const res = await fetch('/api/overrides');
    if (!res.ok) return; // 401 / transient -- retry on the next sign-in signal
    const server = (await res.json()) as OverrideMap;
    const { pushes, pulls } = planMerge(getAllOverrides(), server);
    for (const teamId of pushes) {
      await pushTeamOverride(teamId, getAllOverrides()[teamId]);
    }
    for (const teamId of Object.keys(pulls)) {
      setTeamOverride(teamId, pulls[teamId]);
    }
  } catch {
    // ignore -- localStorage stays the cache; a later sign-in signal retries
  } finally {
    merging = false;
  }
}
