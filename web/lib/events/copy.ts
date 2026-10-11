// Headline and detail text for every team event. One template per event type, so the
// same event always renders the same words wherever it is shown.

import { RECORD_STATS, type RecordStat } from '@/lib/stat-files/records';

export interface EventCopy {
  headline: string;
  detail: string | null;
  notificationTitle?: string;
  notificationBody?: string;
}

const STAT_LABELS: Record<RecordStat, string> = {
  passing_tds: 'passing touchdowns',
  passing_yards: 'passing yards',
  receiving_tds: 'receiving touchdowns',
  receiving_yards: 'receiving yards',
  rushing_tds: 'rushing touchdowns',
  rushing_yards: 'rushing yards',
};

export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function starterChangeCopy(args: {
  teamName: string;
  teamCity?: string;
  position: string;
  playerName: string;
  previousName: string;
}): EventCopy {
  return {
    headline: `${args.teamName}: ${args.playerName} is the new starter at ${args.position}`,
    detail: `Replaces ${args.previousName}.`,
    notificationTitle: `Lineup alert: ${args.teamCity ?? args.teamName}`,
    notificationBody: `${args.playerName} is the new starter at ${args.position}.`,
  };
}

export function tradeCopy(args: {
  teamName: string;
  teamCity: string;
  direction: 'in' | 'out';
  position: string;
  playerName: string;
}): EventCopy {
  const verb = args.direction === 'out' ? 'traded' : 'acquired';
  return {
    headline: `${args.teamName} ${verb} ${args.position} ${args.playerName}`,
    detail: null,
    notificationTitle: `Trade alert: ${args.teamCity}`,
    notificationBody: `${args.teamCity} ${verb} ${args.position} ${args.playerName}.`,
  };
}

// `fromSeason` is the first season the ranking covers. The claim is always scoped to it;
// a wider one would need a source that reaches further back.
export function recordChaseCopy(args: {
  teamCity: string;
  playerName: string;
  stat: RecordStat;
  value: number;
  record: number;
  fromSeason: number;
}): EventCopy {
  const lead = `${args.playerName} has ${formatCount(args.value)} ${STAT_LABELS[args.stat]}`;
  const scope = `the most in a season since ${args.fromSeason}`;
  const tail =
    args.value > args.record
      ? scope
      : args.value === args.record
        ? `tied for ${scope}`
        : `${formatCount(args.record - args.value)} short of ${scope}`;
  return {
    headline: `${lead}, ${tail}`,
    detail: `Previous best: ${formatCount(args.record)}.`,
    notificationTitle: `Record watch: ${args.teamCity}`,
    notificationBody: `${lead}.`,
  };
}

export function historicWeekCopy(args: {
  teamCity: string;
  playerName: string;
  stat: RecordStat;
  value: number;
  week: number;
  rank: number;
  fromSeason: number;
}): EventCopy {
  const place = args.rank === 1 ? 'the most' : `the ${ordinal(args.rank)}-most`;
  return {
    headline:
      `${args.playerName} had ${formatCount(args.value)} ${STAT_LABELS[args.stat]} ` +
      `in Week ${args.week}, ${place} in a game since ${args.fromSeason}`,
    detail: null,
    notificationTitle: `Historic performance: ${args.teamCity}`,
    notificationBody: `${args.playerName} had ${formatCount(args.value)} ${STAT_LABELS[args.stat]} in Week ${args.week}.`,
  };
}

export function depthChangeCopy(args: {
  teamName: string;
  playerName: string;
  position: string;
  rank: number | null;
  previousRank: number | null;
}): EventCopy {
  return {
    headline:
      args.rank === null
        ? `${args.teamName}: ${args.playerName} is no longer listed at ${args.position}`
        : `${args.teamName}: ${args.playerName} is now #${args.rank} at ${args.position}`,
    detail:
      args.previousRank === null
        ? 'Not previously listed here.'
        : `Previously #${args.previousRank}.`,
  };
}
export function injuryChangeCopy(args: {
  teamName: string;
  playerName: string;
  designations: readonly string[];
  previous: readonly string[];
}): EventCopy {
  return {
    headline:
      args.designations.length === 0
        ? `${args.teamName}: ${args.playerName} is no longer listed on the injury report`
        : `${args.teamName}: ${args.playerName} is listed as ${args.designations.join(', ')}`,
    detail:
      args.previous.length === 0
        ? 'Previously not listed on the injury report.'
        : `Previously ${args.previous.join(', ')}.`,
  };
}
export function rosterTransactionCopy(args: {
  teamName: string;
  playerName: string;
  position: string;
  verb: string;
  scope: string | null;
}): EventCopy {
  return {
    headline: `${args.teamName} ${args.verb} ${args.position} ${args.playerName}`,
    detail: args.scope ? `${args.scope[0].toUpperCase()}${args.scope.slice(1)}.` : null,
  };
}
export function goodWeekCopy(args: {
  playerName: string;
  week: number;
  stats: Partial<Record<RecordStat, number>>;
}): EventCopy {
  const facts = RECORD_STATS.flatMap((stat) =>
    args.stats[stat] === undefined ? [] : [`${formatCount(args.stats[stat])} ${STAT_LABELS[stat]}`]
  );
  return {
    headline: `${args.playerName} had ${facts.join(' and ')} in Week ${args.week}`,
    detail: null,
  };
}
