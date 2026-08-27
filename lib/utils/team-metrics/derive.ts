// The one place nflverse team-metric math lives. Two callers need the same derived
// values from the same `team_season_stats` columns and must never disagree:
// `buildMatchupMetrics` (lib/utils/compare/matchup-metrics.ts), which builds the
// TeamMatchupMetrics contract a page renders, and `buildLeagueRanks`
// (lib/roster-source.db.ts), which ranks all 32 teams on those same values. If each
// recomputed the math, a page could show one number and rank it as if it were another
// -- a disagreement no type check or render test would catch, because both halves would
// be internally consistent. Hence: one derivation, two consumers, one anti-drift test.
//
// Every helper here refuses to turn a missing source value into zero (invariant 6). A
// partial nflverse season yields `undefined`, which callers render as an absent row and
// an absent rank -- never as a team that gained nothing and allowed nothing.

/// The raw `team_season_stats` columns every derived value below is computed from. Both
/// the value-row and rank-row `Pick<>`s in lib/roster-source.db.ts must stay a superset
/// of this shape, or a derived value silently becomes `undefined` for every team.
export interface RawTeamMetricColumns {
  games: number | null;
  attempts: number | null;
  carries: number | null;
  sacks_suffered: number | null;
  passing_epa: number | null;
  rushing_epa: number | null;
  passing_interceptions: number | null;
  fumbles_lost_total: number | null;
  def_qb_hits: number | null;
  def_interceptions: number | null;
  def_fumbles: number | null;
  fg_made: number | null;
  fg_att: number | null;
  pt_att: number | null;
  pt_net_yards: number | null;
  punt_returns: number | null;
  punt_return_yards: number | null;
  kickoff_returns: number | null;
  kickoff_return_yards: number | null;
}

export interface DerivedTeamMetrics {
  offensiveEpa: number | undefined;
  offensivePlays: number | undefined;
  offensiveEpaPerPlay: number | undefined;
  /// Sacks as a share of dropbacks, 0-1. The denominator is attempts + sacks, because a
  /// sack ends a dropback without recording a pass attempt.
  sackRate: number | undefined;
  giveaways: number | undefined;
  defensiveTakeaways: number | undefined;
  defensiveTakeawaysPerGame: number | undefined;
  /// Takeaways won minus giveaways conceded. Signed, and `undefined` unless BOTH halves
  /// are known -- a team with an unknown giveaway count has an unknown margin, not a
  /// margin equal to its takeaways.
  turnoverMargin: number | undefined;
  quarterbackHitsPerGame: number | undefined;
  fieldGoalPercentage: number | undefined;
  netPuntYardsPerAttempt: number | undefined;
  puntReturnYardsPerAttempt: number | undefined;
  kickoffReturnYardsPerAttempt: number | undefined;
}

/// Narrows a nullable source column to the `undefined`-shaped optional the metric
/// contracts use. Exported because matchup-metrics.ts passes raw columns straight
/// through for the non-derived half of its contract.
export function present(value: number | null): number | undefined {
  return value ?? undefined;
}

/// Adds source columns, refusing the sum when ANY input is missing: a partial total
/// would read as a real, smaller number rather than as missing data.
export function sum(values: Array<number | null>): number | undefined {
  return values.every((value): value is number => value !== null)
    ? values.reduce((total, value) => total + value, 0)
    : undefined;
}

/// Divides, refusing a zero or negative denominator so an empty sample yields
/// `undefined` rather than `Infinity`/`NaN` leaking into a rank sort.
export function ratio(
  numerator: number | undefined,
  denominator: number | undefined
): number | undefined {
  return numerator === undefined || denominator === undefined || denominator <= 0
    ? undefined
    : numerator / denominator;
}

export function deriveTeamMetrics(row: RawTeamMetricColumns): DerivedTeamMetrics {
  const games = present(row.games);
  const offensiveEpa = sum([row.passing_epa, row.rushing_epa]);
  const offensivePlays = sum([row.attempts, row.carries, row.sacks_suffered]);
  const dropbacks = sum([row.attempts, row.sacks_suffered]);
  const giveaways = sum([row.passing_interceptions, row.fumbles_lost_total]);
  const defensiveTakeaways = sum([row.def_interceptions, row.def_fumbles]);

  return {
    offensiveEpa,
    offensivePlays,
    offensiveEpaPerPlay: ratio(offensiveEpa, offensivePlays),
    sackRate: ratio(present(row.sacks_suffered), dropbacks),
    giveaways,
    defensiveTakeaways,
    defensiveTakeawaysPerGame: ratio(defensiveTakeaways, games),
    turnoverMargin:
      defensiveTakeaways === undefined || giveaways === undefined
        ? undefined
        : defensiveTakeaways - giveaways,
    quarterbackHitsPerGame: ratio(present(row.def_qb_hits), games),
    fieldGoalPercentage: ratio(present(row.fg_made), present(row.fg_att)),
    netPuntYardsPerAttempt: ratio(present(row.pt_net_yards), present(row.pt_att)),
    puntReturnYardsPerAttempt: ratio(present(row.punt_return_yards), present(row.punt_returns)),
    kickoffReturnYardsPerAttempt: ratio(
      present(row.kickoff_return_yards),
      present(row.kickoff_returns)
    ),
  };
}
