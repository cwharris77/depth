// Position -> displayed season-stat-line mapping for the PlayerCard "LAST SEASONS"
// block (docs/superpowers/specs/2026-07-07-nflverse-ingestion-and-player-stats-
// design.md). Pure: given a position and one season's stats, produces the one-line
// summary or null. Null means "don't render this season's row" -- either games is
// null/0 (locked decision: show nothing, not zeros) or the position has no exhaustive
// mapping entry, which shouldn't happen since every Position is covered below.

import type { PlayerSeasonStats, Position } from './types';

function n(value: number | null): number {
  return value ?? 0;
}

// def_sacks is fractional (half-sacks) -- show "2.5", not "2.5" -> "2" truncation or
// "2.500000" float noise.
function formatSacks(value: number | null): string {
  const v = n(value);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function statLine(position: Position, stats: PlayerSeasonStats): string | null {
  if (!stats.games) return null;

  switch (position) {
    case 'QB':
      return `${n(stats.completions)}/${n(stats.attempts)} · ${n(stats.passingYards)} yds · ${n(stats.passingTds)} TD · ${n(stats.passingInterceptions)} INT`;
    case 'RB': {
      const base = `${n(stats.carries)} car · ${n(stats.rushingYards)} yds · ${n(stats.rushingTds)} TD`;
      return n(stats.receptions) > 0 ? `${base} · ${n(stats.receptions)} rec` : base;
    }
    case 'WR':
    case 'TE':
      return `${n(stats.receptions)} rec · ${n(stats.receivingYards)} yds · ${n(stats.receivingTds)} TD`;
    case 'LT':
    case 'LG':
    case 'C':
    case 'RG':
    case 'RT':
      return `${n(stats.games)} games`;
    case 'DE':
    case 'DT':
    case 'LB':
    case 'CB':
    case 'S': {
      const segments = [`${n(stats.defTacklesSolo)} tkl`];
      if (n(stats.defSacks) > 0) segments.push(`${formatSacks(stats.defSacks)} sk`);
      if (n(stats.defInterceptions) > 0) segments.push(`${n(stats.defInterceptions)} INT`);
      return segments.join(' · ');
    }
    case 'K':
      return `${n(stats.fgMade)}/${n(stats.fgAtt)} FG`;
    case 'P':
    case 'LS':
    case 'KR':
    case 'PR':
      return `${n(stats.games)} games`;
  }
}
