import { colors as uiTokens } from '@/components/ui/tokens';
import type { PlayerStatus, TeamColors } from '@/lib/types';

// The dark app background. uiAccent values are curated to read against this.
export const DARK_BG = uiTokens.bg;

// Convert a 6-digit (or 3-digit short) hex color to an rgba() string at the
// given percentage opacity. Short hex (#RGB) is expanded first.
export function withAlpha(hex: string, pct: number): string {
  const cleaned = hex.replace('#', '');
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${pct / 100})`;
}

// Standard focus ring: 3px box-shadow using the given color at 30% opacity,
// matching the tokens.focusRing intent (accent @30%).
export function focusRing(color: string): string {
  return `0 0 0 3px ${withAlpha(color, 30)}`;
}

// Status colors. "starter" is team-driven (uiAccent so each team reads on the dark UI);
// backup/rookie/injured are fixed semantic colors shared by every team.
const FIXED_STATUS: Record<Exclude<PlayerStatus, 'starter'>, string> = {
  backup: '#A5ACAF',
  rookie: '#4fc3f7',
  injured: '#ef5350',
};

export function statusColor(status: PlayerStatus, colors: TeamColors): string {
  return status === 'starter' ? colors.uiAccent : FIXED_STATUS[status];
}

// Schedule game-result color (W/L/T), shared by the schedule page and its desktop
// panel. Win green is a literal (no token yet); loss/tie map to existing UI tokens.
const GAME_RESULT_COLOR: Record<'W' | 'L' | 'T', string> = {
  W: '#3fb950',
  L: uiTokens.statusInjured,
  T: uiTokens.textMuted,
};

export function gameResultColor(result: 'W' | 'L' | 'T'): string {
  return GAME_RESULT_COLOR[result];
}

// WCAG relative-luminance contrast ratio between two hex colors (#rrggbb).
// Used to guarantee every team's uiAccent stays legible on the dark UI.
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const m = hex.replace('#', '');
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
const LIGHT_TEXT = '#ffffff';
export function readableTextOn(bg: string): string {
  return contrastRatio(LIGHT_TEXT, bg) >= contrastRatio(DARK_BG, bg) ? LIGHT_TEXT : DARK_BG;
}
