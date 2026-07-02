import { createClient } from "@supabase/supabase-js";
import type { Player, PlayerStatus, Position, SpecialSlot, Team, TeamRoster } from "./types";
import type { RosterSource, TeamMeta } from "./roster-source";
import type { Database } from "./database.types";
import { type PlayerHit, rankByNameMatch } from "./search";

// Postgres-backed RosterSource (roadmap: ESPN ingestion -> DB -> app). Reads
// teams/players/depth_chart_entries/special_teams_slots and assembles the same
// TeamRoster shape the app already renders.

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars (see .env.local.example)",
    );
  }
  return createClient<Database>(url, key);
}

type Tables = Database["public"]["Tables"];
type TeamRow = Pick<
  Tables["teams"]["Row"],
  | "id"
  | "abbrev"
  | "city"
  | "name"
  | "conference"
  | "division"
  | "color_primary"
  | "color_secondary"
  | "color_accent"
  | "ui_accent"
  | "on_accent"
  | "logo_url"
  | "logo_dark_url"
>;
type PlayerRow = Pick<
  Tables["players"]["Row"],
  | "id"
  | "team_id"
  | "name"
  | "number"
  | "position"
  | "status"
  | "age"
  | "college"
  | "experience"
  | "height"
  | "weight"
  | "bio"
  | "photo_url"
>;
type DepthChartRow = Pick<
  Tables["depth_chart_entries"]["Row"],
  "team_id" | "position" | "depth_rank" | "player_id"
>;
type SpecialSlotRow = Pick<
  Tables["special_teams_slots"]["Row"],
  "team_id" | "label" | "player_id" | "x" | "y"
>;

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

type PlayerSearchRow = Pick<
  Tables["players"]["Row"],
  "id" | "name" | "number" | "position" | "photo_url"
> & {
  teams: Pick<Tables["teams"]["Row"], "id" | "city" | "name" | "abbrev"> | null;
};
const PLAYER_SEARCH_SELECT =
  "id, name, number, position, photo_url, teams(id, city, name, abbrev)";

function toPlayerHit(row: PlayerSearchRow): PlayerHit | null {
  // A dangling team_id (shouldn't happen, FK-enforced) would leave the embedded
  // relation null — skip rather than surface a hit with no team to jump to.
  if (!row.teams) return null;
  return {
    id: row.id,
    name: row.name,
    number: row.number ?? 0,
    position: row.position as Position,
    photoUrl: row.photo_url ?? undefined,
    team: row.teams,
  };
}

// Searches every ingested team's players, not just one roster — backs the nav's
// player-search mode so it can surface a hit on any of the 32 teams. Runs the three
// match kinds (name substring, exact position, exact number) as separate queries
// rather than building one OR'd filter string, so user input never gets interpolated
// into PostgREST filter syntax. `players_name_trgm_idx` (pg_trgm GIN) keeps the name
// ILIKE fast as the table grows past the current ~2,000 rows.
export async function searchAllPlayers(query: string, limit = 8): Promise<PlayerHit[]> {
  const q = query.trim();
  if (!q) return [];
  const client = supabase();

  const asNumber = Number(q);
  const isNumberQuery = Number.isInteger(asNumber);

  const queries = [
    client.from("players").select(PLAYER_SEARCH_SELECT).ilike("name", `%${q}%`).limit(limit).returns<PlayerSearchRow[]>(),
    client.from("players").select(PLAYER_SEARCH_SELECT).ilike("position", q).limit(limit).returns<PlayerSearchRow[]>(),
  ];
  if (isNumberQuery) {
    queries.push(
      client.from("players").select(PLAYER_SEARCH_SELECT).eq("number", asNumber).limit(limit).returns<PlayerSearchRow[]>(),
    );
  }

  const results = await Promise.all(queries);
  for (const { error } of results) {
    if (error) throw new Error(`players search failed: ${error.message}`);
  }

  const byId = new Map<string, PlayerHit>();
  for (const { data } of results) {
    for (const row of data ?? []) {
      const hit = toPlayerHit(row);
      if (hit) byId.set(hit.id, hit);
    }
  }

  return rankByNameMatch([...byId.values()], q).slice(0, limit);
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
    const metas = rows.map(toTeam);
    return metas.sort((a, b) => a.id.localeCompare(b.id));
  },
  async getTeam(id: string): Promise<TeamRoster | undefined> {
    try {
      const roster = await fetchTeamRoster(id);
      if (roster) return roster;
    } catch {
      // DB unavailable/misconfigured → fall through to undefined below.
    }
    // Not in the DB (not yet ingested, or unknown id) → undefined -> 404.
    return undefined;
  },
};
