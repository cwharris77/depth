import type { Position } from '../types';
import { classifyDepthChartCode, depthChartUnit, type DepthChartRole } from './positions';

// The roles persisted with a roster row. The holder and kickoff specialist are classified
// but nothing reads them, so they are not stored.
export type StoredDepthChartRole = Extract<DepthChartRole, 'nb' | 'kr' | 'pr'>;
const STORED_ROLES: ReadonlySet<DepthChartRole> = new Set(['nb', 'kr', 'pr']);

// Role -> the club's depth rank for it, 1 being the starter.
export type RosterRoles = Partial<Record<StoredDepthChartRole, number>>;

function toRank(value: string | undefined): number | null {
  const n = Number(value?.trim());
  return Number.isInteger(n) && n >= 1 ? n : null;
}

// Converts nflverse's two historical depth-chart schemas into the app's position
// vocabulary. Unlike roster_<season>.csv, depth charts carry a real field slot; the
// final regular-season snapshot is therefore the source of truth for historical side
// labels. This stays pure so ingest and the one-time backfill use precisely
// the same selection rule.
//
// Only a row that names a field position sets one: a role such as nickel back or
// returner, or a reviewed code with no canonical position, leaves the player on whatever
// else he is charted at, or on his roster position. `unmappedCodes` counts rows per
// `unit:code` that no table knows (or `formation:code` when the unit itself is
// unreadable), so a code nflverse starts publishing is reported instead of vanishing.
//
// `roles` holds each team's holders of a stored role as of the last snapshot in which the
// club charted that role, so a player who lost the job mid-season is not still listed.
// A holder with no usable rank is ranked first when he is the only one; otherwise the
// source did not order him against the others, so he is left out and counted in
// `unrankedRoles`.
export function mapHistoricalDepthChartPositions(
  season: number,
  rows: Record<string, string>[],
  resolveTeamCode: (code: string) => string | null
): {
  positions: Map<string, Position>;
  roles: Map<string, RosterRoles>;
  unmappedCodes: Record<string, number>;
  unrankedRoles: Record<string, number>;
} {
  const positions = new Map<string, { order: number; position: Position }>();
  const roleSnapshots = new Map<
    string,
    {
      teamId: string;
      role: StoredDepthChartRole;
      order: number;
      holders: Map<string, number | null>;
    }
  >();
  const unmapped = new Map<string, number>();
  for (const row of rows) {
    const legacy = season <= 2024;
    if (legacy && row.game_type !== 'REG') continue;
    const code = (legacy ? row.depth_position : row.pos_abb)?.trim() ?? '';
    const label = (legacy ? row.formation : row.pos_grp)?.trim() ?? '';
    const unit = depthChartUnit(label, legacy);
    const classified = unit ? classifyDepthChartCode(unit, code) : { kind: 'unmapped' as const };
    if (classified.kind === 'unmapped') {
      const reported = `${unit ?? label}:${code}`;
      unmapped.set(reported, (unmapped.get(reported) ?? 0) + 1);
    }
    if (classified.kind !== 'position' && classified.kind !== 'role') continue;
    const teamId = resolveTeamCode((legacy ? row.club_code : row.team)?.trim() ?? '');
    const gsisId = row.gsis_id?.trim();
    if (!teamId || !gsisId) continue;
    const order = legacy ? Number(row.week) : Date.parse(row.dt ?? '');
    if (!Number.isFinite(order)) continue;

    if (classified.kind === 'position') {
      const key = `${teamId}|${gsisId}`;
      const existing = positions.get(key);
      if (!existing || order >= existing.order) {
        positions.set(key, { order, position: classified.position });
      }
      continue;
    }

    if (!STORED_ROLES.has(classified.role)) continue;
    const role = classified.role as StoredDepthChartRole;
    const snapshotKey = `${teamId}|${role}`;
    let snapshot = roleSnapshots.get(snapshotKey);
    if (!snapshot || order > snapshot.order) {
      snapshot = { teamId, role, order, holders: new Map() };
      roleSnapshots.set(snapshotKey, snapshot);
    } else if (order < snapshot.order) {
      continue;
    }
    const rank = toRank(legacy ? row.depth_team : row.pos_rank);
    const held = snapshot.holders.get(gsisId);
    if (held === undefined || held === null || (rank !== null && rank < held)) {
      snapshot.holders.set(gsisId, rank ?? held ?? null);
    }
  }

  const roles = new Map<string, RosterRoles>();
  const unranked = new Map<string, number>();
  for (const { teamId, role, holders } of roleSnapshots.values()) {
    for (const [gsisId, held] of holders) {
      const rank = held ?? (holders.size === 1 ? 1 : null);
      if (rank === null) {
        unranked.set(role, (unranked.get(role) ?? 0) + 1);
        continue;
      }
      const key = `${teamId}|${gsisId}`;
      roles.set(key, { ...roles.get(key), [role]: rank });
    }
  }

  const sorted = (counts: Map<string, number>) =>
    Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
  return {
    positions: new Map([...positions].map(([key, value]) => [key, value.position])),
    roles,
    unmappedCodes: sorted(unmapped),
    unrankedRoles: sorted(unranked),
  };
}
