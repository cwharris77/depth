// Position -> season-stats *table* columns for the PlayerCard's SEASON STATS block
// (design spec 5a: a columnar table, not a single inline line). Pure: given a position it
// returns the ordered columns to render (header + a value accessor + optional danger
// flag); given one season's stats a column produces its formatted cell. `hasSeasonStats`
// is the "show nothing, not zeros" gate (Decisions 2026-07-02) — a season with no games
// played is dropped rather than rendered as a row of zeros. Every Position is covered.

import type { PlayerSeasonStats, Position } from './types';

export interface StatColumn {
  header: string;
  value: (s: PlayerSeasonStats) => string;
  // True → render this cell in the warning color (e.g. a high INT count). The card owns
  // the actual color; this only flags which cells qualify.
  danger?: (s: PlayerSeasonStats) => boolean;
}

function n(value: number | null): number {
  return value ?? 0;
}

// Thousands separators (e.g. 3624 -> "3,624") without Intl/ICU, matching the roster-leaders
// formatter so yardage reads the same everywhere.
function grp(value: number | null): string {
  return String(n(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Per-attempt/per-carry/per-reception averages; "—" when the denominator is 0 rather than
// dividing by zero (degrade, don't fake — a player with 0 attempts has no average).
function ratio(num: number | null, den: number | null): string {
  const d = n(den);
  return d > 0 ? (n(num) / d).toFixed(1) : '—';
}

// def_sacks is fractional (shared/half-sacks) -- show "2.5", not float noise.
function formatSacks(value: number | null): string {
  const v = n(value);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// Only render a season the player actually played (games > 0). Mirrors the old
// statLine's null-on-no-games gate, now a standalone predicate the card filters on.
export function hasSeasonStats(stats: PlayerSeasonStats): boolean {
  return !!stats.games;
}

export function seasonStatColumns(position: Position): StatColumn[] {
  switch (position) {
    case 'QB':
      return [
        { header: 'CMP/ATT', value: (s) => `${n(s.completions)}/${n(s.attempts)}` },
        { header: 'YDS', value: (s) => grp(s.passingYards) },
        { header: 'TD', value: (s) => String(n(s.passingTds)) },
        {
          header: 'INT',
          value: (s) => String(n(s.passingInterceptions)),
          danger: (s) => n(s.passingInterceptions) > 12,
        },
        { header: 'YPA', value: (s) => ratio(s.passingYards, s.attempts) },
      ];
    case 'RB':
      return [
        { header: 'CAR', value: (s) => String(n(s.carries)) },
        { header: 'YDS', value: (s) => grp(s.rushingYards) },
        { header: 'TD', value: (s) => String(n(s.rushingTds)) },
        { header: 'REC', value: (s) => String(n(s.receptions)) },
        { header: 'YPC', value: (s) => ratio(s.rushingYards, s.carries) },
      ];
    case 'WR':
    case 'TE':
      return [
        { header: 'REC', value: (s) => String(n(s.receptions)) },
        { header: 'TGT', value: (s) => String(n(s.targets)) },
        { header: 'YDS', value: (s) => grp(s.receivingYards) },
        { header: 'TD', value: (s) => String(n(s.receivingTds)) },
        { header: 'YPR', value: (s) => ratio(s.receivingYards, s.receptions) },
      ];
    case 'LT':
    case 'LG':
    case 'C':
    case 'RG':
    case 'RT':
      return [{ header: 'GP', value: (s) => String(n(s.games)) }];
    case 'DE':
    case 'DT':
    case 'LB':
    case 'CB':
    case 'S':
      return [
        { header: 'TKL', value: (s) => String(n(s.defTacklesSolo)) },
        { header: 'SK', value: (s) => formatSacks(s.defSacks) },
        { header: 'INT', value: (s) => String(n(s.defInterceptions)) },
      ];
    case 'K':
      return [
        { header: 'FGM', value: (s) => String(n(s.fgMade)) },
        { header: 'FGA', value: (s) => String(n(s.fgAtt)) },
        {
          header: 'FG%',
          value: (s) => {
            const a = n(s.fgAtt);
            return a > 0 ? ((n(s.fgMade) / a) * 100).toFixed(0) : '—';
          },
        },
      ];
    case 'P':
    case 'LS':
    case 'KR':
    case 'PR':
      return [{ header: 'GP', value: (s) => String(n(s.games)) }];
  }
}
