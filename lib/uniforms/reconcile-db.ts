import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';
import type { TeamColors } from '../types';
import { contrastRatio, DARK_BG } from '../colors';
import { decideReconcile, type PendingHome } from './reconcile';

// ESPN drift auto-promote — the I/O half. Runs after the weekly ESPN ingest writes
// teams.colors. For each team it asks decideReconcile() (pure) what to do, then applies it:
// stage/clear the pending candidate, bootstrap a missing home row, or — on a change
// confirmed by two distinct weekly pulls — pin the new home in place and snapshot the old
// one as a retired row. Alerts (promotions + holds) are returned for the caller to surface.

const AA = 4.5;

type TeamColorRow = {
  id: string;
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
  ui_accent: string | null;
  on_accent: string | null;
  pending_home_colors: Database['public']['Tables']['teams']['Row']['pending_home_colors'];
};

type HomeColorRow = {
  id: string;
  team_id: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  ui_accent: string;
  on_accent: string;
  year_start: number | null;
};

// Mirror toTeam()'s defaults so the compared colors match exactly what the app renders.
function rowColors(r: {
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
  ui_accent: string | null;
  on_accent: string | null;
}): TeamColors {
  return {
    primary: r.color_primary ?? '#333333',
    secondary: r.color_secondary ?? '#666666',
    accent: r.color_accent ?? r.color_secondary ?? '#666666',
    uiAccent: r.ui_accent ?? '#4CC3FF',
    onAccent: r.on_accent ?? '#0a0e1a',
  };
}

function asPending(v: unknown): PendingHome | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.primary === 'string' &&
    typeof o.secondary === 'string' &&
    typeof o.runId === 'string'
  ) {
    return { primary: o.primary, secondary: o.secondary, runId: o.runId };
  }
  return null;
}

export interface ReconcileSummary {
  bootstrapped: string[];
  staged: string[];
  cleared: string[];
  held: { team: string; reason: string }[];
  promoted: { team: string; retiredId: string }[];
  alerts: string[];
}

type Client = SupabaseClient<Database>;

async function setPending(
  client: Client,
  teamId: string,
  pending: PendingHome | null
): Promise<void> {
  const { error } = await client
    .from('teams')
    .update({ pending_home_colors: pending as unknown as Json | null })
    .eq('id', teamId);
  if (error) throw new Error(`reconcile: set pending for ${teamId}: ${error.message}`);
}

async function upsertHome(
  client: Client,
  row: {
    id: string;
    teamId: string;
    colors: TeamColors;
    isCurrent: boolean;
    yearStart: number | null;
    yearEnd: number | null;
    name: string;
  }
): Promise<void> {
  const { error } = await client.from('uniforms').upsert(
    {
      id: row.id,
      team_id: row.teamId,
      kind: 'home',
      source: 'espn',
      name: row.name,
      year_start: row.yearStart,
      year_end: row.yearEnd,
      is_current: row.isCurrent,
      color_primary: row.colors.primary,
      color_secondary: row.colors.secondary,
      color_accent: row.colors.accent,
      ui_accent: row.colors.uiAccent,
      on_accent: row.colors.onAccent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(`reconcile: upsert home ${row.id}: ${error.message}`);
}

// The current home keeps its stable `${team}-home` id; promotion updates it in place.
async function pinCurrentHome(client: Client, id: string, colors: TeamColors): Promise<void> {
  const { error } = await client
    .from('uniforms')
    .update({
      is_current: true,
      year_start: null,
      year_end: null,
      color_primary: colors.primary,
      color_secondary: colors.secondary,
      color_accent: colors.accent,
      ui_accent: colors.uiAccent,
      on_accent: colors.onAccent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(`reconcile: pin current home ${id}: ${error.message}`);
}

// Retired snapshot id is `${team}-home-<year>`; a second rebrand in the same season appends
// a sequence so it never collides with the first.
async function freeRetiredId(client: Client, teamId: string, year: number): Promise<string> {
  const base = `${teamId}-home-${year}`;
  const { data, error } = await client
    .from('uniforms')
    .select('id')
    .eq('team_id', teamId)
    .like('id', `${base}%`);
  if (error) throw new Error(`reconcile: retired-id lookup ${base}: ${error.message}`);
  const existing = new Set((data ?? []).map((r) => r.id));
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function reconcileHomeUniforms(
  client: Client,
  opts: { seasonYear: number; runId: string }
): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    bootstrapped: [],
    staged: [],
    cleared: [],
    held: [],
    promoted: [],
    alerts: [],
  };

  const { data: teamRows, error: teamErr } = await client
    .from('teams')
    .select(
      'id, color_primary, color_secondary, color_accent, ui_accent, on_accent, pending_home_colors'
    )
    .returns<TeamColorRow[]>();
  if (teamErr) throw new Error(`reconcile: teams read failed: ${teamErr.message}`);

  const { data: homeRows, error: homeErr } = await client
    .from('uniforms')
    .select(
      'id, team_id, color_primary, color_secondary, color_accent, ui_accent, on_accent, year_start'
    )
    .eq('kind', 'home')
    .eq('is_current', true)
    .returns<HomeColorRow[]>();
  if (homeErr) throw new Error(`reconcile: home rows read failed: ${homeErr.message}`);
  const homeByTeam = new Map((homeRows ?? []).map((r) => [r.team_id, r]));

  for (const t of teamRows ?? []) {
    const espn = rowColors(t);
    const homeRow = homeByTeam.get(t.id) ?? null;
    const home = homeRow ? rowColors(homeRow) : null;
    const pending = asPending(t.pending_home_colors);
    const isLegible = contrastRatio(espn.uiAccent, DARK_BG) >= AA;

    const decision = decideReconcile({
      espn,
      home,
      pending,
      runId: opts.runId,
      seasonYear: opts.seasonYear,
      isLegible,
    });

    switch (decision.action) {
      case 'noop':
        break;
      case 'bootstrap':
        await upsertHome(client, {
          id: `${t.id}-home`,
          teamId: t.id,
          colors: espn,
          isCurrent: true,
          yearStart: null,
          yearEnd: null,
          name: 'Home',
        });
        summary.bootstrapped.push(t.id);
        break;
      case 'clear-pending':
        await setPending(client, t.id, null);
        summary.cleared.push(t.id);
        break;
      case 'stage':
        await setPending(client, t.id, decision.pending);
        summary.staged.push(t.id);
        break;
      case 'hold':
        await setPending(client, t.id, null);
        summary.held.push({ team: t.id, reason: decision.reason });
        summary.alerts.push(
          `HOLD ${t.id} (${decision.reason}): ESPN now says ${espn.primary}/${espn.secondary} but it was not applied — review.`
        );
        break;
      case 'promote': {
        if (!homeRow || !home) break; // decideReconcile only promotes when a home row exists
        const retiredId = await freeRetiredId(client, t.id, decision.retiredYear);
        const yy = String(decision.retiredYear).slice(2);
        // 1. snapshot the OLD colors as a retired row (keeps history)
        await upsertHome(client, {
          id: retiredId,
          teamId: t.id,
          colors: home,
          isCurrent: false,
          yearStart: homeRow.year_start,
          yearEnd: decision.retiredYear,
          name: `Home '${yy}`,
        });
        // 2. pin the current `${team}-home` row to the NEW colors
        await pinCurrentHome(client, homeRow.id, espn);
        // 3. streak consumed
        await setPending(client, t.id, null);
        summary.promoted.push({ team: t.id, retiredId });
        summary.alerts.push(
          `PROMOTED ${t.id}: new home ${espn.primary}/${espn.secondary}; old look retired as "${retiredId}" ("Home '${yy}") — rename it to the real era.`
        );
        break;
      }
    }
  }

  return summary;
}
