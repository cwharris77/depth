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
import { readableTextOn } from '@/lib/utils/colors';

export interface Coach {
  name: string;
  espnId: string;
  experience: number;
}

// The site roster payload's top-level coach array has at most one entry (the head
// coach — ESPN doesn't expose the rest of the staff cheaply). Missing/empty array
// (expansion team, offseason gap) -> null, never a crash (invariant 6). Consumed
// directly by scripts/ingest-espn.mts for the teams.coach_* columns and by the team
// stats page (../obsidian/Projects/depth/specs/2026-07-12-team-stats-page-design.md) — no
// longer threaded through Team/TeamRoster.
export function toCoach(roster: EspnRoster): Coach | null {
  const coach = roster.coach?.[0];
  if (!coach) return null;
  return {
    name: `${coach.firstName} ${coach.lastName}`,
    espnId: coach.id,
    experience: coach.experience,
  };
}

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

// ESPN exposes team identity colors, not per-jersey palettes. Keep this transform scoped
// to the machine-owned brand_colors table; uniforms are curated independently.
export function toBrandColors(espn: EspnTeamInfo): TeamColors {
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

// Generates a one-line bio from the athlete's birthplace — genuinely additive info
// not shown anywhere else on the card (unlike experience, which duplicates the EXP
// stat). State covers US-born players; falls back to country for international
// players lacking a state. Falls back to empty string when birthPlace or even the
// city is missing, which the UI suppresses rather than rendering filler copy.
function playerBio(birthPlace: EspnAthlete['birthPlace']): string {
  if (!birthPlace?.city) return '';
  const region = birthPlace.state || birthPlace.country;
  return region ? `Born in ${birthPlace.city}, ${region}` : `Born in ${birthPlace.city}`;
}

function toPlayer(a: EspnAthlete, position: Position, depthRank: 1 | 2 | 3): Player {
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
    bio: playerBio(a.birthPlace),
    photoUrl: a.headshot?.href,
  };
}

// One `depth_chart_entries` row: a position slot, its 1..3 rank, and who fills it.
// Emitted per ESPN slot, so one athlete may hold slots at more than one position
// (DEP-585) -- unlike `players`, which keeps exactly one identity row per athlete.
export interface DepthChartSlot {
  position: Position;
  depthRank: 1 | 2 | 3;
  playerId: string;
}

// depth_chart_entries has a unique (team_id, position, depth_rank) constraint, but
// multiple ESPN depthchart keys can still collapse into one Position for the handful of
// codes with no side/role in ESPN's data (e.g. lb+mlb -> LB), each independently ranked
// 1..3 -- so two LB1s can exist on `players`. Re-rank within
// each position group (stable: existing depthRank, then jersey number) and cap at 3,
// dropping the rest, so every (team, position, rank) triple is unique for DB writes.
// The in-memory Player.depthRank is untouched -- lib/utils/roster/roster.ts's getPlayersByPosition
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

// Exported for lib/roster-source.db.ts's getTeamSeason (Phase D1 historical rosters):
// historical data has no ESPN depth chart to source K/P/LS/KR/PR slot coordinates from,
// so it reuses this same fixed layout.
export const SPECIAL_LAYOUT = [
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
}): TeamRoster & { depthChartSlots: DepthChartSlot[] } {
  const { meta, roster, depthcharts, teamInfo } = args;

  // Bio lookup by athlete id (from the flat site roster).
  const bios = new Map<string, EspnAthlete>();
  for (const group of roster.athletes ?? []) {
    for (const a of group.items ?? []) bios.set(a.id, a);
  }

  const players: Player[] = [];
  const seen = new Set<string>();
  // Every (position, rank, athlete) ESPN publishes, recorded independently of `seen`
  // (DEP-585). `seen` exists to keep one identity row per athlete in `players`, but it
  // used to gate slot emission too, so an athlete ESPN cross-lists -- a swing tackle at
  // `lt` and `rt`, an interior lineman at `lg` and `rg` -- was claimed by whichever key
  // iterated first and silently vanished from the other. That left the Chiefs with no
  // right tackle at all and the league 15-18 entries short at RT/RG. Identity dedupes
  // here; slots must not.
  const rawSlots: { position: Position; rank: number; playerId: string; number: number }[] = [];
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
            if (!pid) continue;
            const bio = bios.get(pid);
            if (!bio) continue;
            rawSlots.push({
              position: rosterPosition,
              rank,
              playerId: pid,
              number: Number(bio.jersey ?? 0) || 0,
            });
            if (seen.has(pid)) continue;
            seen.add(pid);
            players.push(toPlayer(bio, rosterPosition, rank as 1 | 2 | 3));
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
        if (!id) continue;
        const bio = bios.get(id);
        if (!bio) continue; // depthchart athlete not in roster → skip, no crash
        rawSlots.push({
          position,
          rank,
          playerId: id,
          number: Number(bio.jersey ?? 0) || 0,
        });
        if (seen.has(id)) continue;
        seen.add(id);
        players.push(toPlayer(bio, position, rank as 1 | 2 | 3));
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
    players.push(toPlayer(bio, fallbackPosition, 3));
  }

  // Collapse the raw slots into the DB's shape: unique (position, depth_rank), ranks
  // 1..3. Same re-ranking toDepthChartRows did, but driven by ESPN's own slots rather
  // than re-derived from players.position -- which is what let one athlete hold only one
  // position. Every emitted slot's player is in `players` (identity was recorded on his
  // first appearance), so depth_chart_entries.player_id's FK is always satisfied.
  const slotsByPosition = new Map<Position, typeof rawSlots>();
  const seenSlot = new Set<string>();
  for (const slot of rawSlots) {
    if (!seen.has(slot.playerId)) continue;
    // ESPN can repeat an athlete inside one position group across depth-chart items
    // (e.g. a base and a sub package); one row per (position, athlete).
    const key = `${slot.position}:${slot.playerId}`;
    if (seenSlot.has(key)) continue;
    seenSlot.add(key);
    const group = slotsByPosition.get(slot.position) ?? [];
    group.push(slot);
    slotsByPosition.set(slot.position, group);
  }

  const depthChartSlots: DepthChartSlot[] = [];
  for (const [position, group] of slotsByPosition) {
    const ranked = [...group].sort((a, b) => a.rank - b.rank || a.number - b.number);
    ranked.slice(0, 3).forEach((slot, i) => {
      depthChartSlots.push({
        position,
        depthRank: (i + 1) as 1 | 2 | 3,
        playerId: slot.playerId,
      });
    });
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
      colors: toBrandColors(teamInfo),
      logo: logos[0]?.href,
      logoDark: logos.find((l) => l.rel?.includes('dark'))?.href ?? logos[1]?.href,
    },
    players,
    specialTeams,
    depthChartSlots,
    // Uniforms are a separate hand-curated domain (lib/uniforms), ingested on their own.
    // The ESPN ingest doesn't own them, so it emits none here.
    uniforms: [],
  };
}
