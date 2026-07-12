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
