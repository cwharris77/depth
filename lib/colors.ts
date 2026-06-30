import type { PlayerStatus, TeamColors } from "./types";

// The dark app background. uiAccent values are curated to read against this.
export const DARK_BG = "#0a0e1a";

// Status colors. "starter" is team-driven (uiAccent so each team reads on the dark UI);
// backup/rookie/injured are fixed semantic colors shared by every team.
const FIXED_STATUS: Record<Exclude<PlayerStatus, "starter">, string> = {
  backup: "#A5ACAF",
  rookie: "#4fc3f7",
  injured: "#ef5350",
};

export function statusColor(status: PlayerStatus, colors: TeamColors): string {
  return status === "starter" ? colors.uiAccent : FIXED_STATUS[status];
}

// WCAG relative-luminance contrast ratio between two hex colors (#rrggbb).
// Used to guarantee every team's uiAccent stays legible on the dark UI.
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Pick readable text (white or near-black) for an arbitrary background. Lets the OG
// card put text on a team's brand primary safely, whatever that primary is.
const LIGHT_TEXT = "#ffffff";
export function readableTextOn(bg: string): string {
  return contrastRatio(LIGHT_TEXT, bg) >= contrastRatio(DARK_BG, bg)
    ? LIGHT_TEXT
    : DARK_BG;
}
