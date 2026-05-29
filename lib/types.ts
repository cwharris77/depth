export type Position =
  | "QB" | "RB" | "WR" | "TE"
  | "LT" | "LG" | "C" | "RG" | "RT"
  | "DE" | "DT" | "LB" | "CB" | "S"
  | "K" | "P" | "LS" | "KR" | "PR";

export type PlayerStatus = "starter" | "backup" | "rookie" | "injured";

export type Unit = "offense" | "defense" | "special";

export type Conference = "AFC" | "NFC";
export type Division = "North" | "South" | "East" | "West";

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  depthRank: 1 | 2 | 3;
  status: PlayerStatus;
  age: number;
  college: string;
  experience: number;
  height: string;
  weight: number;
  bio: string;
  stats?: Record<string, string | number>;
}

// FieldSlot = where on the field a player lines up.
// x/y are percentages (0–100). y=0 top, y=100 bottom. Scrimmage line at y=50.
export interface FieldSlot {
  id: string;
  playerId: string;
  x: number;
  y: number;
  label: string;
}

export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Team {
  id: string;
  city: string;
  name: string;
  abbrev: string;
  conference: Conference;
  division: Division;
  colors: TeamColors;
}

export interface TeamRoster {
  team: Team;
  players: Player[];
  formations: Record<Unit, FieldSlot[]>;
}
