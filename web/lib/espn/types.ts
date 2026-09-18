export interface EspnRoster {
  season: { year: number };
  athletes: { position: string; items: EspnAthlete[] }[];
  coach?: EspnCoach[];
}
export interface EspnCoach {
  id: string;
  firstName: string;
  lastName: string;
  experience: number;
}
export interface EspnAthlete {
  id: string;
  fullName: string;
  jersey?: string;
  position?: { abbreviation?: string };
  age?: number;
  displayHeight?: string;
  height?: string;
  displayWeight?: string;
  weight?: number;
  college?: { name?: string } | string;
  experience?: { years?: number };
  status?: { type?: string };
  headshot?: { href?: string };
  birthPlace?: { city?: string; state?: string; country?: string };
  // Present on the site roster and on core `athletes/{id}` records. A non-empty array is
  // the only trustworthy injury signal ESPN gives us -- `status.type` also carries
  // roster bookkeeping like `practice-squad` and `free-agent`, which are not injuries
  // (DEP-585).
  injuries?: { status?: string }[];
  // Core-API-only fields, used when hydrating a depth-chart athlete the site roster
  // omits: ESPN's own assertion of which team the athlete belongs to (DEP-585).
  active?: boolean;
  team?: { $ref?: string };
}
export interface EspnDepthcharts {
  items: EspnDepthItem[];
}
export interface EspnDepthItem {
  name: string;
  positions: Record<string, EspnDepthPosition>;
}
export interface EspnDepthPosition {
  position?: { abbreviation?: string };
  athletes: { slot?: number; rank?: number; athlete: { $ref: string } }[];
}
export interface EspnTeamInfo {
  id: string;
  abbreviation: string;
  color?: string;
  alternateColor?: string;
  logos?: { href: string; rel?: string[] }[];
}
