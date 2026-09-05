import type { Position } from '../types';
import { mapRosterPosition, type RosterPosition } from './positions';
import { rankByUsage, usageScore, type UsageEntry, type UsageStatsRow } from './depth-heuristic';

// 1999 is where stats_player_reg_ starts -- the depth heuristic needs a stats file to
// rank against, so earlier seasons are out of scope (locked decision, phase-d spec).
// Shared by the ingest script (range validation) and the app (SeasonSheet's lower
// bound, the history route's 404 range check).
export const SEASONS_MIN = 1999;

// Pure join of one season's roster_<season>.csv + stats_player_reg_<season>.csv into
// roster_history upsert rows (../obsidian/Projects/depth/specs/2026-07-07-phase-d-history-and-
// boards-design.md). No fetch, no DB -- scripts/ingest-nflverse-rosters.mts is the I/O
// glue. A roster row missing gsis_id/full_name, whose team code doesn't resolve, or
// whose position doesn't map is skipped and counted, never guessed (AGENTS.md
// invariant 6). A player traded mid-season can appear more than once for the same team
// in the raw CSV (e.g. a practice-squad elevation); the last occurrence wins, matching
// roster_history's (season, team_id, gsis_id) primary key.
//
// `espn_id` comes from the roster CSV when present, else from the caller-supplied
// gsis_id -> espn_id crosswalk (the same players.csv buildCrosswalk the player-stats
// ingest uses). The roster CSV's espn_id column is sparse for older seasons (near-zero
// in 1999), so without the fallback most historical rows would carry a null espn_id
// and the profile read path (SupabaseDepthRepository.playerStats resolves the historical
// id via roster_history.espn_id) could never reach their player_stats rows.

export interface RosterHistoryInsert {
  season: number;
  team_id: string;
  gsis_id: string;
  espn_id: string | null;
  name: string;
  number: number | null;
  position: string;
  college: string | null;
  height: string | null;
  weight: number | null;
  headshot_url: string | null;
  depth_rank: number;
  player_order: number;
}

function toNullableText(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function toNullableInt(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

interface RosterEntry {
  teamId: string;
  gsisId: string;
  position: RosterPosition;
  espnId: string | null;
  name: string;
  number: number | null;
  college: string | null;
  height: string | null;
  weight: number | null;
  headshotUrl: string | null;
}

function buildUsageByGsisId(statsCsvRows: Record<string, string>[]): Map<string, UsageStatsRow> {
  const usage = new Map<string, UsageStatsRow>();
  for (const row of statsCsvRows) {
    const gsisId = row.player_id?.trim();
    if (!gsisId) continue;
    usage.set(gsisId, {
      attempts: toNullableInt(row.attempts),
      carries: toNullableInt(row.carries),
      targets: toNullableInt(row.targets),
      games: toNullableInt(row.games),
      defTacklesSolo: toNullableInt(row.def_tackles_solo),
      defSacks: toNullableNumber(row.def_sacks),
      defInterceptions: toNullableInt(row.def_interceptions),
      fgAtt: toNullableInt(row.fg_att),
    });
  }
  return usage;
}

export function toRosterHistoryRows(
  season: number,
  rosterCsvRows: Record<string, string>[],
  statsCsvRows: Record<string, string>[],
  resolveTeamCode: (code: string) => string | null,
  crosswalk: Map<string, string> = new Map(),
  depthChartPositions: Map<string, Position> = new Map()
): { rows: RosterHistoryInsert[]; skipped: number } {
  const usageByGsisId = buildUsageByGsisId(statsCsvRows);

  let skipped = 0;
  // Keyed by team+player so a mid-season trade/elevation collapses to one row per the
  // table's primary key -- last occurrence in the CSV wins.
  const byKey = new Map<string, RosterEntry>();

  for (const row of rosterCsvRows) {
    const gsisId = row.gsis_id?.trim();
    const name = row.full_name?.trim();
    const teamId = resolveTeamCode(row.team?.trim() ?? '');
    const positionCode = row.depth_chart_position?.trim() || row.position?.trim() || '';
    const rosterPosition = mapRosterPosition(positionCode);
    if (!gsisId || !name || !teamId || !rosterPosition) {
      skipped++;
      continue;
    }
    // A depth-chart position is authoritative only when it belongs to this exact
    // team/player key. Roster CSV fallback intentionally stays generic OT/G.
    const position = depthChartPositions.get(`${teamId}|${gsisId}`) ?? rosterPosition;
    byKey.set(`${teamId}|${gsisId}`, {
      teamId,
      gsisId,
      position,
      // The roster CSV's espn_id wins when present; the crosswalk fills the gap for
      // older seasons where the CSV never carried one.
      espnId: toNullableText(row.espn_id) ?? crosswalk.get(gsisId) ?? null,
      name,
      number: toNullableInt(row.jersey_number),
      college: toNullableText(row.college),
      height: toNullableText(row.height),
      weight: toNullableInt(row.weight),
      headshotUrl: toNullableText(row.headshot_url),
    });
  }

  const byTeam = new Map<string, RosterEntry[]>();
  for (const entry of byKey.values()) {
    const list = byTeam.get(entry.teamId) ?? [];
    list.push(entry);
    byTeam.set(entry.teamId, list);
  }

  const rows: RosterHistoryInsert[] = [];
  for (const [teamId, entries] of byTeam) {
    const usageEntries: UsageEntry<RosterEntry>[] = entries.map((entry) => ({
      item: entry,
      position: entry.position,
      number: entry.number ?? 0,
      usage: usageScore(entry.position, usageByGsisId.get(entry.gsisId)),
    }));
    for (const ranked of rankByUsage(usageEntries)) {
      rows.push({
        season,
        team_id: teamId,
        gsis_id: ranked.item.gsisId,
        espn_id: ranked.item.espnId,
        name: ranked.item.name,
        number: ranked.item.number,
        position: ranked.position,
        college: ranked.item.college,
        height: ranked.item.height,
        weight: ranked.item.weight,
        headshot_url: ranked.item.headshotUrl,
        depth_rank: ranked.depthRank,
        player_order: ranked.playerOrder,
      });
    }
  }

  return { rows, skipped };
}
