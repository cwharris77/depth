import { createClient } from "@supabase/supabase-js";
import type { Player, PlayerStatus, Position, SpecialSlot, Team, TeamRoster } from "./types";
import type { RosterSource, TeamMeta } from "./roster-source";
import { SEAHAWKS } from "./teams/seahawks";

// Postgres-backed RosterSource (roadmap: ESPN ingestion -> DB -> app). Reads
// teams/players/depth_chart_entries/special_teams_slots and assembles the same
// TeamRoster shape the app already renders. Falls back to the hand-authored Seahawks
// data (lib/teams/seahawks.ts) if a team isn't present in the DB yet — same
// graceful-fallback spirit as the original static-registry plan, so a partial or
// not-yet-run ingestion never breaks the app.

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars (see .env.local.example)",
    );
  }
  return createClient(url, key);
}

interface TeamRow {
  id: string;
  abbrev: string;
  city: string;
  name: string;
  conference: string;
  division: string;
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
  ui_accent: string | null;
  on_accent: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
}

interface PlayerRow {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: string;
  status: string | null;
  age: number | null;
  college: string | null;
  experience: number | null;
  height: string | null;
  weight: number | null;
  bio: string | null;
  photo_url: string | null;
}

interface DepthChartRow {
  team_id: string;
  position: string;
  depth_rank: number;
  player_id: string;
}

interface SpecialSlotRow {
  team_id: string;
  label: string;
  player_id: string | null;
  x: number | string | null;
  y: number | string | null;
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    city: row.city,
    name: row.name,
    abbrev: row.abbrev,
    conference: row.conference as Team["conference"],
    division: row.division as Team["division"],
    colors: {
      primary: row.color_primary ?? "#333333",
      secondary: row.color_secondary ?? "#666666",
      accent: row.color_accent ?? row.color_secondary ?? "#666666",
      uiAccent: row.ui_accent ?? "#4CC3FF",
      onAccent: row.on_accent ?? "#0a0e1a",
    },
    logo: row.logo_url ?? undefined,
    logoDark: row.logo_dark_url ?? undefined,
  };
}

function toPlayer(row: PlayerRow, depthRank: 1 | 2 | 3): Player {
  return {
    id: row.id,
    name: row.name,
    number: row.number ?? 0,
    position: row.position as Position,
    depthRank,
    status: (row.status ?? "backup") as PlayerStatus,
    age: row.age ?? 0,
    college: row.college ?? "—",
    experience: row.experience ?? 0,
    height: row.height ?? "—",
    weight: row.weight ?? 0,
    bio: row.bio ?? "",
    photoUrl: row.photo_url ?? undefined,
  };
}

async function fetchTeamRoster(teamId: string): Promise<TeamRoster | undefined> {
  const client = supabase();

  const { data: teamRow, error: teamError } = await client
    .from("teams")
    .select(
      "id, abbrev, city, name, conference, division, color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url",
    )
    .eq("id", teamId)
    .maybeSingle<TeamRow>();
  if (teamError) throw new Error(`teams query failed: ${teamError.message}`);
  if (!teamRow) return undefined;

  const [{ data: depthRows, error: depthError }, { data: stRows, error: stError }] =
    await Promise.all([
      client
        .from("depth_chart_entries")
        .select("team_id, position, depth_rank, player_id")
        .eq("team_id", teamId)
        .returns<DepthChartRow[]>(),
      client
        .from("special_teams_slots")
        .select("team_id, label, player_id, x, y")
        .eq("team_id", teamId)
        .returns<SpecialSlotRow[]>(),
    ]);
  if (depthError) throw new Error(`depth_chart_entries query failed: ${depthError.message}`);
  if (stError) throw new Error(`special_teams_slots query failed: ${stError.message}`);

  // Special-teams player ids can reference a player who has no depth_chart_entries
  // row -- e.g. a returner who's a low-rank WR outside the top-3-per-position cap
  // (see lib/espn/transform.ts's toTeamRoster fallback). Pull those in too, or
  // specialTeams would point at a playerId absent from the assembled `players`.
  const stPlayerIds = (stRows ?? []).map((r) => r.player_id).filter((id): id is string => !!id);
  const playerIds = Array.from(
    new Set([...(depthRows ?? []).map((r) => r.player_id), ...stPlayerIds]),
  );
  let playerRows: PlayerRow[] = [];
  if (playerIds.length) {
    const { data, error } = await client
      .from("players")
      .select(
        "id, team_id, name, number, position, status, age, college, experience, height, weight, bio, photo_url",
      )
      .in("id", playerIds)
      .returns<PlayerRow[]>();
    if (error) throw new Error(`players query failed: ${error.message}`);
    playerRows = data ?? [];
  }
  const playersById = new Map(playerRows.map((p) => [p.id, p]));

  const players: Player[] = [];
  const addedPlayerIds = new Set<string>();
  for (const row of depthRows ?? []) {
    const playerRow = playersById.get(row.player_id);
    if (!playerRow) continue; // dangling reference → skip, never crash
    const rank = row.depth_rank as 1 | 2 | 3;
    players.push(toPlayer(playerRow, rank));
    addedPlayerIds.add(row.player_id);
  }
  // Special-teams-only players (no depth_chart_entries row): included at a nominal
  // depthRank of 3 (bench/reserve placeholder), matching the ingestion-side transform.
  for (const id of stPlayerIds) {
    if (addedPlayerIds.has(id)) continue;
    const playerRow = playersById.get(id);
    if (!playerRow) continue;
    players.push(toPlayer(playerRow, 3));
    addedPlayerIds.add(id);
  }

  const specialTeams: SpecialSlot[] = (stRows ?? []).map((row, i) => ({
    id: `${row.team_id}-st-${i}`,
    playerId: row.player_id,
    x: row.x === null ? 50 : Number(row.x),
    y: row.y === null ? 50 : Number(row.y),
    label: row.label,
  }));

  return {
    team: toTeam(teamRow),
    players,
    specialTeams,
  };
}

async function fetchAllTeamMeta(): Promise<TeamRow[]> {
  const client = supabase();
  const { data, error } = await client
    .from("teams")
    .select(
      "id, abbrev, city, name, conference, division, color_primary, color_secondary, color_accent, ui_accent, on_accent, logo_url, logo_dark_url",
    )
    .returns<TeamRow[]>();
  if (error) throw new Error(`teams query failed: ${error.message}`);
  return data ?? [];
}

export const dbRosterSource: RosterSource = {
  async listTeams(): Promise<TeamMeta[]> {
    const rows = await fetchAllTeamMeta();
    const dbIds = new Set(rows.map((r) => r.id));
    const metas = rows.map(toTeam);
    // Seahawks stays hand-authored and may not be in the DB yet — include it if missing.
    if (!dbIds.has(SEAHAWKS.team.id)) metas.push(SEAHAWKS.team);
    return metas.sort((a, b) => a.id.localeCompare(b.id));
  },
  async getTeam(id: string): Promise<TeamRoster | undefined> {
    if (id === SEAHAWKS.team.id) {
      // Seahawks is intentionally kept hand-authored (richer bios/stats showcase),
      // matching the repo's existing convention (lib/teams/seahawks.ts).
      const dbTeam = await fetchTeamRoster(id).catch(() => undefined);
      return dbTeam ?? SEAHAWKS;
    }
    try {
      const roster = await fetchTeamRoster(id);
      if (roster) return roster;
    } catch {
      // DB unavailable/misconfigured → fall through to the static fallback below.
    }
    // Not in the DB (not yet ingested, or ingestion hasn't run) → no fallback data
    // exists for non-Seahawks teams in the DB-first world; undefined -> 404, same as
    // an unknown id.
    return undefined;
  },
};
