import type {
  Player,
  PlayerStatus,
  Position,
  SpecialSlot,
  Team,
  TeamColors,
  TeamRoster,
} from "../types";
import type { EspnAthlete, EspnDepthcharts, EspnRoster, EspnTeamInfo } from "./types";
import { classifyItem, mapDepthchartPosition, mapSpecialPosition } from "./positions";

export function parseAthleteId(ref: string): string | null {
  const m = ref.match(/athletes\/(\d+)/);
  return m ? m[1] : null;
}

function hex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.startsWith("#") ? value : `#${value}`;
}

export function toTeamColors(espn: EspnTeamInfo, curated: TeamColors): TeamColors {
  const primary = hex(espn.color, curated.primary);
  const secondary = hex(espn.alternateColor, curated.secondary);
  return {
    primary,
    secondary,
    accent: secondary,
    uiAccent: curated.uiAccent, // curated for dark-UI contrast — ESPN can't supply
    onAccent: curated.onAccent,
  };
}

function collegeName(c: EspnAthlete["college"]): string {
  if (!c) return "—";
  return typeof c === "string" ? c : (c.name ?? "—");
}

function statusOf(a: EspnAthlete, depthRank: number): PlayerStatus {
  const t = a.status?.type;
  if (t && t !== "active") return "injured";
  if ((a.experience?.years ?? 0) === 0) return "rookie";
  return depthRank > 1 ? "backup" : "starter";
}

function toPlayer(
  a: EspnAthlete,
  position: Position,
  depthRank: 1 | 2 | 3,
  teamLabel: string,
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
    height: a.displayHeight ?? a.height ?? "—",
    weight: parseInt(String(a.displayWeight ?? a.weight ?? "0"), 10) || 0,
    bio: `${position} for the ${teamLabel}.`,
    photoUrl: a.headshot?.href,
  };
}

const SPECIAL_LAYOUT = [
  { slot: "kr", id: "st-kr", x: 30, y: 18, label: "KR" },
  { slot: "pr", id: "st-pr", x: 70, y: 18, label: "PR" },
  { slot: "ls", id: "st-ls", x: 50, y: 68, label: "LS" },
  { slot: "k", id: "st-k", x: 38, y: 80, label: "K" },
  { slot: "p", id: "st-p", x: 62, y: 80, label: "P" },
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
      if (kind === "special") {
        const slot = mapSpecialPosition(key);
        if (!slot) continue;
        const ranked = [...(posData.athletes ?? [])].sort(
          (a, b) => (a.rank ?? 99) - (b.rank ?? 99),
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
      colors: toTeamColors(teamInfo, meta.colors),
      logo: logos[0]?.href,
      logoDark: logos.find((l) => l.rel?.includes("dark"))?.href ?? logos[1]?.href,
    },
    players,
    specialTeams,
  };
}
