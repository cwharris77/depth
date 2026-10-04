// Derives completed seasons' `team_coach_seasons` rows from nfldata's games.csv, whose
// `home_coach`/`away_coach` columns name each team's head coach for every game since
// 1999. Pure: no fetch, no DB.
//
// One row per (team, season): the coach who led the most regular-season games. A tie
// goes to whoever coached the team's last regular-season game, so a split season
// credits the coach the team finished with. `coach_experience` counts seasons with this
// team including the given one, the same unit lib/espn/coach-seasons.ts writes: the
// same coach as the team's previous row adds one, anyone else starts at 1.
//
// The file starts in 1999, so a coach already in place that year would otherwise start
// at 1. PRE_1999_FIRST_SEASONS supplies those coaches' first credited season with the
// team, applying the same majority rule to the seasons before the file begins.
//
// A season with an unplayed regular-season game is still in progress and gets no row:
// the ESPN ingest owns the current season's coach.

export interface CoachSeasonInsert {
  team_id: string;
  season: number;
  coach_name: string;
  coach_experience: number;
  source: 'nflverse';
}

/** First season each 1999 head coach led the team, for tenures the file can't see. */
export const PRE_1999_FIRST_SEASONS: Record<string, { coach: string; firstSeason: number }> = {
  '49ers': { coach: 'Steve Mariucci', firstSeason: 1997 },
  bengals: { coach: 'Bruce Coslet', firstSeason: 1996 },
  bills: { coach: 'Wade Phillips', firstSeason: 1998 },
  broncos: { coach: 'Mike Shanahan', firstSeason: 1995 },
  buccaneers: { coach: 'Tony Dungy', firstSeason: 1996 },
  cardinals: { coach: 'Vince Tobin', firstSeason: 1996 },
  colts: { coach: 'Jim Mora', firstSeason: 1998 },
  commanders: { coach: 'Norv Turner', firstSeason: 1994 },
  cowboys: { coach: 'Chan Gailey', firstSeason: 1998 },
  dolphins: { coach: 'Jimmy Johnson', firstSeason: 1996 },
  falcons: { coach: 'Dan Reeves', firstSeason: 1997 },
  giants: { coach: 'Jim Fassel', firstSeason: 1997 },
  jaguars: { coach: 'Tom Coughlin', firstSeason: 1995 },
  jets: { coach: 'Bill Parcells', firstSeason: 1997 },
  lions: { coach: 'Bobby Ross', firstSeason: 1997 },
  patriots: { coach: 'Pete Carroll', firstSeason: 1997 },
  raiders: { coach: 'Jon Gruden', firstSeason: 1998 },
  rams: { coach: 'Dick Vermeil', firstSeason: 1997 },
  saints: { coach: 'Mike Ditka', firstSeason: 1997 },
  steelers: { coach: 'Bill Cowher', firstSeason: 1992 },
  titans: { coach: 'Jeff Fisher', firstSeason: 1995 },
  vikings: { coach: 'Dennis Green', firstSeason: 1992 },
};

interface Tally {
  games: Map<string, number>;
  lastWeek: number;
  lastCoach: string;
  complete: boolean;
}

/**
 * Coach rows for every team-season from `fromSeason` through `throughSeason` that has
 * regular-season games with a named coach. Rows outside that range are ignored, and a
 * game whose team code doesn't resolve or whose coach cell is blank is skipped.
 * Experience is computed from the file's first season onward regardless of
 * `fromSeason`, so a later start still carries the right tenure.
 */
export function toCoachSeasonRows(
  csvRows: Record<string, string>[],
  resolveCode: (code: string) => string | null,
  { fromSeason, throughSeason }: { fromSeason: number; throughSeason: number }
): CoachSeasonInsert[] {
  const tallies = new Map<string, Map<number, Tally>>();

  for (const row of csvRows) {
    if (row.game_type?.trim() !== 'REG') continue;
    const season = Number(row.season);
    const week = Number(row.week);
    if (!Number.isInteger(season) || season > throughSeason || !Number.isInteger(week)) continue;
    for (const side of ['home', 'away'] as const) {
      const teamId = resolveCode(row[`${side}_team`]?.trim() ?? '');
      const coach = row[`${side}_coach`]?.trim();
      if (!teamId || !coach) continue;
      const bySeason = tallies.get(teamId) ?? new Map<number, Tally>();
      tallies.set(teamId, bySeason);
      const tally = bySeason.get(season) ?? {
        games: new Map(),
        lastWeek: -1,
        lastCoach: coach,
        complete: true,
      };
      bySeason.set(season, tally);
      if (row.home_score?.trim() === '' || row.home_score === undefined) tally.complete = false;
      tally.games.set(coach, (tally.games.get(coach) ?? 0) + 1);
      if (week >= tally.lastWeek) {
        tally.lastWeek = week;
        tally.lastCoach = coach;
      }
    }
  }

  const rows: CoachSeasonInsert[] = [];
  for (const [teamId, bySeason] of [...tallies].sort(([a], [b]) => a.localeCompare(b))) {
    let prior: { season: number; coach: string; experience: number } | null = null;
    for (const [season, tally] of [...bySeason].sort(([a], [b]) => a - b)) {
      const coach = creditedCoach(tally);
      let experience = 1;
      if (prior && prior.season === season - 1 && prior.coach === coach) {
        experience = prior.experience + 1;
      } else if (!prior) {
        const earlier = PRE_1999_FIRST_SEASONS[teamId];
        if (earlier?.coach === coach) experience = season - earlier.firstSeason + 1;
      }
      prior = { season, coach, experience };
      if (season >= fromSeason && tally.complete) {
        rows.push({
          team_id: teamId,
          season,
          coach_name: coach,
          coach_experience: experience,
          source: 'nflverse',
        });
      }
    }
  }
  return rows;
}

function creditedCoach(tally: Tally): string {
  const most = Math.max(...tally.games.values());
  const leaders = [...tally.games].filter(([, games]) => games === most).map(([coach]) => coach);
  return leaders.includes(tally.lastCoach) ? tally.lastCoach : leaders[0];
}
