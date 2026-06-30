import type {
  Conference,
  Division,
  Player,
  PlayerStatus,
  Position,
  SpecialSlot,
  TeamColors,
  TeamRoster,
} from "../types";

// Builder for the best-effort static rosters (Phase 3). Player detail here is a
// point-in-time placeholder, structurally complete so every formation slot fills.
// It is meant to be swapped for a live ApiRosterSource (ESPN) behind the existing
// RosterSource seam — at which point this hand-authored data goes away.

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Reasonable height/weight by position so cards don't look uniform.
const BUILD: Record<Position, [string, number]> = {
  QB: ["6'3\"", 220], RB: ["5'11\"", 215], WR: ["6'1\"", 200], TE: ["6'5\"", 250],
  LT: ["6'5\"", 315], LG: ["6'4\"", 315], C: ["6'3\"", 305], RG: ["6'4\"", 315], RT: ["6'6\"", 318],
  DE: ["6'4\"", 270], DT: ["6'3\"", 305], LB: ["6'2\"", 240], CB: ["5'11\"", 193], S: ["6'1\"", 205],
  K: ["6'0\"", 200], P: ["6'2\"", 215], LS: ["6'2\"", 240], KR: ["5'10\"", 190], PR: ["5'10\"", 190],
};

export interface RawPlayer {
  name: string;
  number: number;
  position: Position;
  depthRank?: 1 | 2 | 3;
  status?: PlayerStatus;
  age?: number;
  exp?: number;
  college?: string;
}

// Terse player constructor for the data tables below.
export function pl(
  name: string,
  number: number,
  position: Position,
  depthRank: 1 | 2 | 3 = 1,
  extra: Partial<RawPlayer> = {},
): RawPlayer {
  return { name, number, position, depthRank, ...extra };
}

export interface TeamInput {
  id: string;
  city: string;
  name: string;
  abbrev: string;
  conference: Conference;
  division: Division;
  colors: TeamColors;
  players: RawPlayer[];
  // Special teams referenced by jersey number (returners are cross-position picks).
  special: { k: number; p: number; ls: number; kr: number; pr: number };
}

// Constant special-teams field layout, shared by every built team.
const SPECIAL_LAYOUT = [
  { slot: "kr", id: "st-kr", x: 30, y: 18, label: "KR" },
  { slot: "pr", id: "st-pr", x: 70, y: 18, label: "PR" },
  { slot: "ls", id: "st-ls", x: 50, y: 68, label: "LS" },
  { slot: "k", id: "st-k", x: 38, y: 80, label: "K" },
  { slot: "p", id: "st-p", x: 62, y: 80, label: "P" },
] as const;

function buildPlayer(raw: RawPlayer, teamLabel: string): Player {
  const [height, weight] = BUILD[raw.position];
  const depthRank = raw.depthRank ?? 1;
  const status: PlayerStatus = raw.status ?? (depthRank > 1 ? "backup" : "starter");
  return {
    id: slug(raw.name),
    name: raw.name,
    number: raw.number,
    position: raw.position,
    depthRank,
    status,
    age: raw.age ?? 26,
    college: raw.college ?? "—",
    experience: raw.exp ?? 4,
    height,
    weight,
    bio: `${raw.position} for the ${teamLabel}.`,
  };
}

export function buildTeam(input: TeamInput): TeamRoster {
  const teamLabel = `${input.city} ${input.name}`;
  const players = input.players.map((r) => buildPlayer(r, teamLabel));

  const byNumber = new Map<number, Player>();
  for (const p of players) {
    if (!byNumber.has(p.number)) byNumber.set(p.number, p);
  }

  const specialTeams: SpecialSlot[] = SPECIAL_LAYOUT.map(({ slot, id, x, y, label }) => {
    const num = input.special[slot];
    const player = byNumber.get(num);
    if (!player) {
      throw new Error(`${input.id}: special ${label} references missing #${num}`);
    }
    return { id, playerId: player.id, x, y, label };
  });

  return {
    team: {
      id: input.id,
      city: input.city,
      name: input.name,
      abbrev: input.abbrev,
      conference: input.conference,
      division: input.division,
      colors: input.colors,
    },
    players,
    specialTeams,
  };
}
