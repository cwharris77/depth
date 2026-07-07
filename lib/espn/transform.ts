import type {
  Player,
  PlayerStatus,
  Position,
  SpecialSlot,
  Team,
  TeamColors,
  TeamRoster,
} from '../types';
import type { EspnAthlete, EspnDepthcharts, EspnRoster, EspnTeamInfo } from './types';
import {
  classifyItem,
  mapBioPosition,
  mapDepthchartPosition,
  mapSpecialPosition,
} from './positions';
import { readableTextOn } from '../colors';

export function parseAthleteId(ref: string): string | null {
  const m = ref.match(/athletes\/(\d+)/);
  return m ? m[1] : null;
}

function hex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.startsWith('#') ? value : `#${value}`;
}

// A few teams need a hand-picked accent because neither ESPN color works on the dark
// UI. Keyed by ESPN abbreviation → an official team color ESPN's two-color feed omits.
// Ravens: purple primary and black secondary both fail contrast, so use official gold.
const ACCENT_OVERRIDE: Record<string, string> = {
  BAL: '#9e7c0c',
};

// Black and white aren't distinguishing team accents — teams whose ESPN secondary is
// one of them (5 black, 3 white) use their real primary instead.
function isNeutral(hexColor: string): boolean {
  const v = hexColor.toLowerCase();
  return v === '#000000' || v === '#ffffff';
}

export function toTeamColors(espn: EspnTeamInfo): TeamColors {
  const primary = hex(espn.color, '#000000');
  const secondary = hex(espn.alternateColor, '#ffffff');
  // The UI accent is the team's real secondary — the pop color (Seahawks green), which
  // is already what the dot ring uses, so dots and the team picker match. Fall back to
  // the primary when the secondary is a neutral black/white, or to a hand-picked
  // official color for the rare team where neither ESPN color reads (Ravens gold).
  const uiAccent =
    ACCENT_OVERRIDE[espn.abbreviation.toUpperCase()] ??
    (isNeutral(secondary) ? primary : secondary);
  return {
    primary,
    secondary,
    accent: secondary,
    uiAccent,
    onAccent: readableTextOn(uiAccent), // just legible text to paint on the accent
  };
}

function collegeName(c: EspnAthlete['college']): string {
  if (!c) return '—';
  return typeof c === 'string' ? c : (c.name ?? '—');
}

function statusOf(a: EspnAthlete, depthRank: number): PlayerStatus {
  const t = a.status?.type;
  if (t && t !== 'active') return 'injured';
  if ((a.experience?.years ?? 0) === 0) return 'rookie';
  return depthRank > 1 ? 'backup' : 'starter';
}

function toPlayer(
  a: EspnAthlete,
  position: Position,
  depthRank: 1 | 2 | 3,
  teamLabel: string
): Player {
  return {
    id: a.id,
    name: a.fullName,
    number: Number(a.jersey ?? 0),
    position,
    depthRank,
    status: statusOf(a, depthRank),
    age: a.age ?? 0,
    college: collegeName(a.college),
    experience: a.experience?.years ?? 0,
    height: a.displayHeight ?? a.height ?? '—',
    weight: parseInt(String(a.displayWeight ?? a.weight ?? '0'), 10) || 0,
    bio: `${position} for the ${teamLabel}.`,
    photoUrl: a.headshot?.href,
  };
}

// depth_chart_entries has a unique (team_id, position, depth_rank) constraint, but
// multiple ESPN depthchart keys can collapse into one Position (e.g. lde+rde -> DE),
// each independently ranked 1..3 -- so two DE1s can exist on `players`. Re-rank within
// each position group (stable: existing depthRank, then jersey number) and cap at 3,
// dropping the rest, so every (team, position, rank) triple is unique for DB writes.
// The in-memory Player.depthRank is untouched -- lib/roster.ts's getPlayersByPosition
// already tolerates (and relies on) multiple players sharing one raw depthRank.
export function toDepthChartRows(
  players: Player[]
): { position: Position; depthRank: 1 | 2 | 3; playerId: string }[] {
  const byPosition = new Map<Position, Player[]>();
  for (const p of players) {
    const list = byPosition.get(p.position) ?? [];
    list.push(p);
    byPosition.set(p.position, list);
  }

  const rows: { position: Position; depthRank: 1 | 2 | 3; playerId: string }[] = [];
  for (const [position, group] of byPosition) {
    const ranked = [...group].sort((a, b) => a.depthRank - b.depthRank || a.number - b.number);
    ranked.slice(0, 3).forEach((p, i) => {
      rows.push({ position, depthRank: (i + 1) as 1 | 2 | 3, playerId: p.id });
    });
  }
  return rows;
}

const SPECIAL_LAYOUT = [
  { slot: 'kr', id: 'st-kr', x: 30, y: 18, label: 'KR' },
  { slot: 'pr', id: 'st-pr', x: 70, y: 18, label: 'PR' },
  { slot: 'ls', id: 'st-ls', x: 50, y: 68, label: 'LS' },
  { slot: 'k', id: 'st-k', x: 38, y: 80, label: 'K' },
  { slot: 'p', id: 'st-p', x: 62, y: 80, label: 'P' },
] as const;

export function toTeamRoster(args: {
  meta: Team;
  roster: EspnRoster;
  depthcharts: EspnDepthcharts;
  teamInfo: EspnTeamInfo;
}): TeamRoster {
  const { meta, roster, depthcharts, teamInfo } = args;
  const teamLabel = `${meta.city} ${meta.name}`;

  // Bio lookup by athlete id (from the flat site roster).
  const bios = new Map<string, EspnAthlete>();
  for (const group of roster.athletes ?? []) {
    for (const a of group.items ?? []) bios.set(a.id, a);
  }

  const players: Player[] = [];
  const seen = new Set<string>();
  const special: Record<string, string | null> = {
    k: null,
    p: null,
    ls: null,
    kr: null,
    pr: null,
  };

  for (const item of depthcharts.items ?? []) {
    const kind = classifyItem(Object.keys(item.positions ?? {}));

    for (const [key, posData] of Object.entries(item.positions ?? {})) {
      if (kind === 'special') {
        const slot = mapSpecialPosition(key);
        if (!slot) continue;
        const ranked = [...(posData.athletes ?? [])].sort(
          (a, b) => (a.rank ?? 99) - (b.rank ?? 99)
        );
        const first = ranked[0];
        const id = first ? parseAthleteId(first.athlete.$ref) : null;
        if (id && bios.has(id)) special[slot] = id;

        // K/P/LS are also roster positions (not just returner refs) — add them as
        // Players too, same depthRank-1..3 cap as offense/defense, so they render
        // on the field like any other position.
        const rosterPosition = mapDepthchartPosition(key);
        if (rosterPosition) {
          for (const entry of ranked) {
            const rank = entry.rank ?? entry.slot ?? 1;
            if (rank > 3) continue;
            const pid = parseAthleteId(entry.athlete.$ref);
            if (!pid || seen.has(pid)) continue;
            const bio = bios.get(pid);
            if (!bio) continue;
            seen.add(pid);
            players.push(toPlayer(bio, rosterPosition, rank as 1 | 2 | 3, teamLabel));
          }
        }
        continue;
      }

      const position = mapDepthchartPosition(key);
      if (!position) continue;

      for (const entry of posData.athletes ?? []) {
        const rank = entry.rank ?? entry.slot ?? 1;
        if (rank > 3) continue;
        const id = parseAthleteId(entry.athlete.$ref);
        if (!id || seen.has(id)) continue;
        const bio = bios.get(id);
        if (!bio) continue; // depthchart athlete not in roster → skip, no crash
        seen.add(id);
        players.push(toPlayer(bio, position, rank as 1 | 2 | 3, teamLabel));
      }
    }
  }

  // A KR/PR can be a WR/RB ranked well outside our top-3-per-position cap (e.g. a
  // WR7 who is still the primary punt returner) -- so they can be missing from
  // `players` even though they're a valid special-teams reference. Add them anyway,
  // using their own bio position, so specialTeams never points at a dropped player
  // (this also protects the DB's special_teams_slots.player_id FK). depthRank 3 here
  // is a storage placeholder (bench/reserve), not their real offensive rank.
  for (const id of Object.values(special)) {
    if (!id || seen.has(id)) continue;
    const bio = bios.get(id);
    if (!bio) continue;
    const fallbackPosition = mapBioPosition(bio.position?.abbreviation ?? '');
    if (!fallbackPosition) continue;
    seen.add(id);
    players.push(toPlayer(bio, fallbackPosition, 3, teamLabel));
  }

  const specialTeams: SpecialSlot[] = SPECIAL_LAYOUT.map(({ slot, id, x, y, label }) => ({
    id,
    playerId: special[slot] ?? null, // missing returner → empty slot, never a guess
    x,
    y,
    label,
  }));

  const logos = teamInfo.logos ?? [];
  return {
    team: {
      ...meta,
      colors: toTeamColors(teamInfo),
      logo: logos[0]?.href,
      logoDark: logos.find((l) => l.rel?.includes('dark'))?.href ?? logos[1]?.href,
    },
    players,
    specialTeams,
    // Uniforms are a separate hand-curated domain (lib/uniforms), ingested on their own.
    // The ESPN ingest doesn't own them, so it emits none here.
    uniforms: [],
  };
}
