// Headline and detail text for every team event. One template per event type, so the
// same event always renders the same words wherever it is shown.

import type { RecordStat } from '@/lib/stat-files/records';

export interface EventCopy {
  headline: string;
  detail: string | null;
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
  position: string;
  playerName: string;
  previousName: string;
}): EventCopy {
  return {
    headline: `${args.teamName}: ${args.playerName} is the new starter at ${args.position}`,
    detail: `Replaces ${args.previousName}.`,
  };
}

export function tradeCopy(args: {
  teamName: string;
  direction: 'in' | 'out';
  position: string;
  playerName: string;
}): EventCopy {
  const verb = args.direction === 'out' ? 'traded' : 'acquired';
  return {
    headline: `${args.teamName} ${verb} ${args.position} ${args.playerName}`,
    detail: null,
  };
}

// `fromSeason` is the first season the ranking covers. The claim is always scoped to it;
// a wider one would need a source that reaches further back.
export function recordChaseCopy(args: {
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
  return { headline: `${lead}, ${tail}`, detail: `Previous best: ${formatCount(args.record)}.` };
}

export function historicWeekCopy(args: {
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
  };
}
