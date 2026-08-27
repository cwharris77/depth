'use client';

// Season-record view for the team stats page (docs/superpowers/specs/2026-07-14-
// multi-season-team-stats-design.md, season count extended by 2026-08-19-espn-full-
// history-team-stats-design.md). A client component so the season switcher can hold
// local state; it receives one team's already-resolved data as a prop (invariant 5) —
// `seasons` is still just this one team's rows (never a fan-out of all-32 data), but can
// now be 20+ long after a full ESPN backfill, which is why the switcher is a bottom sheet
// (TeamStatsSeasonSheet) instead of the original horizontal chip row.
import SectionLabel from '@/components/ui/SectionLabel';
import Tooltip from '@/components/ui/Tooltip';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';
import { readableTextOn } from '@/lib/utils/colors';
import { formatGameDate, ordinal } from '@/lib/utils/format';
import { displayStreak, isPlayoffSeed } from '@/lib/utils/team/playoff-seed';
import type { TeamMeta, TeamStatsRanks } from '@/lib/roster-source';
import type { Leader, RosterLeaders, TeamScheduleGame, TeamStats } from '@/lib/types';
import { useKitColors } from '@/lib/hooks/use-kit-colors';
import { ChevronDown, History } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import BottomSheet from './BottomSheet';
import StatsPanel from './StatsPanel';
import TeamPageHeader from './TeamPageHeader';
import TeamPageShell from './TeamPageShell';
import TeamStatsSeasonSheet, { type TeamStatsSeasonEntry } from './TeamStatsSeasonSheet';
import UpcomingBadge from './UpcomingBadge';

interface Props {
  team: TeamMeta;
  teams: TeamMeta[];
  seasons: TeamStats[];
  leagueRanksBySeason?: Record<number, TeamStatsRanks>;
  incomingCoach?: { name: string };
  upcomingSeason?: number;
  // The current NFL season year. A season is "completed" (all games played, playoff
  // outcomes known) when its year is less than this. Used to suppress the playoff-status
  // line for seasons that haven't finished yet.
  currentSeason: number;
  // Passing/rushing/receiving leaders per season (design spec 5a), one entry per
  // `seasons` row at the same index. Null at an index when no player stats are
  // ingested for that season; the block is then omitted entirely. Re-derived per the
  // selected season tab, not pinned to the roster's newest season.
  leadersBySeason?: (RosterLeaders | null)[];
  // The team's next unplayed game (design spec 5a's NEXT GAME card). Null in the
  // offseason / once the season is complete, in which case the card is omitted.
  nextGame?: TeamScheduleGame | null;
}

function wl(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

// Coach treatment (design mock 1a, docs/superpowers/specs — Claude Design "Coach Treatment
// Options"): a real type hierarchy — bigger name, accent-colored meta caption — instead of
// one flat 11px line.
function CoachBadge({ name, meta, uiAccent }: { name: string; meta: string; uiAccent: string }) {
  return (
    <div className="mt-[11px]">
      <div
        className="text-[16px] font-extrabold leading-tight"
        style={{ color: uiTokens.textPrimary }}>
        {name}
      </div>
      <div
        className="mt-0.5 font-bold tracking-[0.06em]"
        style={{ color: uiAccent, fontSize: typeScale.label }}>
        {meta}
      </div>
    </div>
  );
}

function rankLabel(
  rank: number | undefined,
  lastRank: number,
  qualifier: 'overall' | 'most' | 'least'
): string | undefined {
  if (!rank) return undefined;
  if (rank === 1) return 'First in NFL';
  if (rank === lastRank) return 'Last in NFL';
  return `${ordinal(rank)} ${qualifier}`;
}

function StatCell({
  label,
  value,
  color,
  rank,
}: {
  label: ReactNode;
  value: string;
  color?: string;
  rank?: string;
}) {
  return (
    <>
      <td className="py-[9px]" style={{ color: uiTokens.textFaint }}>
        {label}
      </td>
      <td className="py-[9px] text-right">
        <div className="font-bold" style={color ? { color } : undefined}>
          {value}
        </div>
        {rank && (
          <div
            className="mt-0.5 font-bold"
            style={{ color: uiTokens.textFaintest, fontSize: typeScale.micro }}>
            {rank}
          </div>
        )}
      </td>
    </>
  );
}

// The nflverse team metrics, as the Stats page's own hairline rows rather than Compare's
// two-column tables. A Compare table answers "which of these two is bigger"; this page
// answers "where does this team sit in the league", so the rank caption StatCell already
// renders for PTS FOR / PASS YDS is what replaces Compare's second team column.
//
// `direction: 'neutral'` metrics from Compare's catalog are deliberately absent: they are
// denominators and context for a two-team comparison, have no better/worse direction, and
// so cannot carry the rank caption that is the entire point of this treatment.
type MetricSpec = {
  label: string;
  // Undefined means the source column was missing — the row is dropped, never zeroed.
  value: (m: NonNullable<TeamStats['matchupMetrics']>) => number | undefined;
  format: (value: number) => string;
  rank: keyof TeamStatsRanks;
  // Feeds rankLabel's copy: "First in NFL" / "3rd most" / "6th least" / "4th overall".
  qualifier: 'overall' | 'most' | 'least';
};

const signed = (digits: number) => (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
const decimal = (digits: number) => (value: number) => value.toFixed(digits);
const integer = (value: number) => String(value);
// Both rate metrics are stored 0-1 (see TeamMatchupMetrics.sackRate); percent lives here
// so no caller has to remember to multiply.
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const METRIC_SECTIONS: { title: string; metrics: MetricSpec[] }[] = [
  {
    title: 'OFFENSE',
    metrics: [
      {
        label: 'EPA / PLAY',
        value: (m) => m.offensiveEpaPerPlay,
        format: signed(2),
        rank: 'offensiveEpaPerPlay',
        qualifier: 'overall',
      },
      {
        label: 'SACK RATE',
        value: (m) => m.sackRate,
        format: percent,
        rank: 'sackRate',
        qualifier: 'least',
      },
      {
        label: 'PASS EPA',
        value: (m) => m.passingEpa,
        format: decimal(1),
        rank: 'passingEpa',
        qualifier: 'most',
      },
      {
        label: 'RUSH EPA',
        value: (m) => m.rushingEpa,
        format: decimal(1),
        rank: 'rushingEpa',
        qualifier: 'most',
      },
      // Labelled INTS THROWN, not INTERCEPTIONS: DEFENSE carries its own INTERCEPTIONS
      // row a few lines down meaning the opposite thing. Compare's catalog labels both
      // "INTERCEPTIONS" and gets away with it only because its unit lenses are never on
      // screen together (Cooper, 2026-08-27).
      {
        label: 'INTS THROWN',
        value: (m) => m.passingInterceptions,
        format: integer,
        rank: 'passingInterceptions',
        qualifier: 'least',
      },
      {
        label: 'FUMBLES LOST',
        value: (m) => m.fumblesLost,
        format: integer,
        rank: 'fumblesLost',
        qualifier: 'least',
      },
    ],
  },
  {
    title: 'DEFENSE',
    metrics: [
      {
        label: 'SACKS',
        value: (m) => m.defensiveSacks,
        format: decimal(1),
        rank: 'defensiveSacks',
        qualifier: 'most',
      },
      {
        label: 'QB HITS / GM',
        value: (m) => m.quarterbackHitsPerGame,
        format: decimal(1),
        rank: 'quarterbackHitsPerGame',
        qualifier: 'most',
      },
      {
        label: 'TAKEAWAYS',
        value: (m) => m.defensiveTakeaways,
        format: integer,
        rank: 'defensiveTakeaways',
        qualifier: 'most',
      },
      {
        label: 'INTERCEPTIONS',
        value: (m) => m.defensiveInterceptions,
        format: integer,
        rank: 'defensiveInterceptions',
        qualifier: 'most',
      },
    ],
  },
  {
    title: 'SPECIAL TEAMS',
    metrics: [
      {
        label: 'FIELD GOAL %',
        value: (m) => m.fieldGoalPercentage,
        format: percent,
        rank: 'fieldGoalPercentage',
        qualifier: 'overall',
      },
      {
        label: 'NET PUNT / ATT',
        value: (m) => m.netPuntYardsPerAttempt,
        format: decimal(1),
        rank: 'netPuntYardsPerAttempt',
        qualifier: 'most',
      },
      {
        label: 'PUNT RET AVG',
        value: (m) => m.puntReturnYardsPerAttempt,
        format: decimal(1),
        rank: 'puntReturnYardsPerAttempt',
        qualifier: 'most',
      },
      {
        label: 'KICK RET AVG',
        value: (m) => m.kickoffReturnYardsPerAttempt,
        format: decimal(1),
        rank: 'kickoffReturnYardsPerAttempt',
        qualifier: 'most',
      },
    ],
  },
];

// One labelled group of metric rows, in the breakdown table's own vocabulary — same
// StatCell, same borderStrong hairline, same full-bleed px-5 inset, no card chrome.
// Absent metrics are filtered out BEFORE pairing, so a missing source column closes the
// gap instead of leaving a hole mid-row; an odd count leaves the final right cell blank,
// exactly as the DIFF row already does.
function MetricSection({
  title,
  metrics,
  showRanks,
  lastRank,
}: {
  title: string;
  metrics: { spec: MetricSpec; display: string; rank?: number }[];
  showRanks: boolean;
  lastRank: number;
}) {
  if (metrics.length === 0) return null;
  const rows: (typeof metrics)[] = [];
  for (let i = 0; i < metrics.length; i += 2) rows.push(metrics.slice(i, i + 2));

  return (
    <div className="px-5 pt-5">
      <SectionLabel className="mb-1 px-0">{title}</SectionLabel>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map((pair, i) => (
            <tr
              key={pair[0].spec.label}
              style={i > 0 ? { borderTop: `1px solid ${uiTokens.borderStrong}` } : undefined}>
              <StatCell
                label={pair[0].spec.label}
                value={pair[0].display}
                rank={
                  showRanks ? rankLabel(pair[0].rank, lastRank, pair[0].spec.qualifier) : undefined
                }
              />
              <td className="w-6" />
              {pair[1] ? (
                <StatCell
                  label={pair[1].spec.label}
                  value={pair[1].display}
                  rank={
                    showRanks
                      ? rankLabel(pair[1].rank, lastRank, pair[1].spec.qualifier)
                      : undefined
                  }
                />
              ) : (
                <td colSpan={2} />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Shared "rounded-2xl bordered row list" shell for the POSTSEASON and ROSTER LEADERS
// sections below — both are a card of rows with no border above the first row and a
// hairline between the rest; only each row's inner content/typography differs, so that
// stays with the caller while this owns the repeated container/border structure.
function RowCardList({
  rows,
  rowPaddingY = 'py-2.5',
}: {
  rows: { key: string; left: ReactNode; right: ReactNode }[];
  rowPaddingY?: 'py-2.5' | 'py-3.5';
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: uiTokens.surfaceCard2, border: `1px solid ${uiTokens.borderSubtle}` }}>
      {rows.map((row, i) => (
        <div
          key={row.key}
          className={`flex items-center justify-between gap-3 px-3.5 ${rowPaddingY}`}
          style={{ borderTop: i === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}` }}>
          {row.left}
          {row.right}
        </div>
      ))}
    </div>
  );
}

// Shared hero-block shell for the two "no season stats yet" states (upcoming season /
// incoming coach) — same wrapper, dashed border, and footer-ticker structure, differing
// only in heading/subline/footer text. The `active` season's hero has its own record +
// breakdown table and doesn't fit this shape, so it stays separate.
function DegradedHero({
  heading,
  subline,
  footerLabel,
}: {
  heading: string;
  subline: string;
  footerLabel: string;
}) {
  return (
    <>
      <div
        className="mt-0.5 px-5 pb-[18px] pt-2"
        style={{ borderBottom: `1px dashed ${uiTokens.borderInput}` }}>
        <div className="text-[28px] font-bold leading-tight tracking-[-0.01em]">{heading}</div>
        <div className="mt-1" style={{ color: uiTokens.textFaint, fontSize: typeScale.label }}>
          {subline}
        </div>
      </div>
      <div
        className="px-5 pb-[22px] pt-3.5 tracking-[0.06em]"
        style={{ color: uiTokens.textFaintest, fontSize: typeScale.caption }}>
        {footerLabel}
      </div>
    </>
  );
}

export default function TeamStatsView({
  team,
  teams,
  seasons,
  leagueRanksBySeason,
  incomingCoach,
  upcomingSeason,
  currentSeason,
  leadersBySeason,
  nextGame,
}: Props) {
  const [index, setIndex] = useState(seasons.length > 0 ? 0 : -1);
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false);
  // Picks up whichever kit is active on the roster page for this team (lib/hooks/use-kit-colors.ts)
  // instead of always showing the default team colors — falls back to team.colors when
  // nothing was ever picked this session.
  const colors = useKitColors(team);
  const { uiAccent } = colors;

  const header = (
    <div
      className="px-5 pb-3"
      style={{ background: uiTokens.bg, paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
      <TeamPageHeader team={team} teams={teams} colors={colors} activePage="stats" />
    </div>
  );

  // Both return paths render inside the shell so desktop keeps the rail + panel frame
  // even in the degraded no-stats state (StatsPanel renders nothing for zero seasons).
  const shellProps = {
    team,
    teams,
    activePage: 'stats' as const,
    accent: uiAccent,
    aside: <StatsPanel seasons={seasons} accent={uiAccent} />,
  };

  if (seasons.length === 0 && !incomingCoach && !upcomingSeason) {
    return (
      <TeamPageShell {...shellProps}>
        <div style={{ minHeight: '100dvh', background: uiTokens.bg, color: uiTokens.textPrimary }}>
          {header}
          <p className="px-5 text-sm" style={{ color: uiTokens.textMuted }}>
            No stats available for this team yet.
          </p>
        </div>
      </TeamPageShell>
    );
  }

  // Ingest can land a real team_stats row for the upcoming season ahead of kickoff (a
  // stub row with no games played yet), in which case that row IS the upcoming season —
  // no separate synthetic chip, just the UPCOMING badge carried onto the real one.
  const upcomingSeasonHasRealRow =
    upcomingSeason !== undefined && seasons.some((s) => s.season === upcomingSeason);

  // Index -1 is the upcoming season (exists during the off-season for ALL teams, not
  // just new-coach teams — Stats & Analytics P2), unless it's already one of the real
  // `seasons` rows above. For teams with an incoming coach, index -2 is the incoming
  // coach chip (no season stats to attach to yet). Both are clamped independently of
  // the real `seasons` array below.
  const hasUpcomingChip = !!upcomingSeason && !upcomingSeasonHasRealRow;
  const hasIncomingCoach = !!incomingCoach;
  const minIndex = hasUpcomingChip ? (hasIncomingCoach ? -2 : -1) : hasIncomingCoach ? -1 : 0;
  const clampedIndex = Math.min(Math.max(index, minIndex), seasons.length - 1);
  const active = clampedIndex >= 0 ? seasons[clampedIndex] : null;

  // Season sheet entries (2026-08-19-espn-full-history-team-stats-design.md): the chip
  // row's newest-first ordering, now as sheet rows instead of horizontally-scrolling
  // buttons — a full ESPN backfill can put 20+ real seasons on this team, past what a
  // chip row scales to. Upcoming chip first (chronologically newest), then real seasons
  // newest-to-oldest; a real row for the upcoming season carries the badge instead of a
  // separate synthetic entry, same rule the old chip row used.
  const seasonEntries: TeamStatsSeasonEntry[] = [
    ...(hasUpcomingChip && upcomingSeason !== undefined
      ? [{ index: -1, label: String(upcomingSeason), upcoming: true }]
      : []),
    ...seasons.map((s, i) => ({
      index: i,
      label: String(s.season),
      upcoming: upcomingSeasonHasRealRow && s.season === upcomingSeason,
    })),
  ];
  // Index -2 (incoming coach, no season attached yet) has no reachable UI trigger today
  // (same as the pre-dropdown chip row -- no chip ever set index to -2 either), so 'NEW'
  // is a defensive fallback, not a real label anyone sees.
  const activeSeasonLabel =
    clampedIndex === -1 && upcomingSeason !== undefined
      ? String(upcomingSeason)
      : active
        ? String(active.season)
        : 'NEW';

  // Leaders for the selected season tab (falls back to null for the upcoming-season/
  // incoming-coach chips, which have no season stats yet — invariant 6).
  const leaders = clampedIndex >= 0 ? (leadersBySeason?.[clampedIndex] ?? null) : null;
  // Passing/rushing/receiving leaders in a fixed order, dropping any category with no
  // leader (invariant 6 — show nothing, not a zeroed row).
  const leaderRows: { label: string; leader: Leader }[] = leaders
    ? (
        [
          ['PASSING', leaders.passing],
          ['RUSHING', leaders.rushing],
          ['RECEIVING', leaders.receiving],
        ] as const
      ).flatMap(([label, leader]) => (leader ? [{ label, leader }] : []))
    : [];

  // The NEXT GAME pill is scoped to the season actually being viewed: the in-progress
  // season while the league is in-season, or the upcoming season during the off-season
  // (Stats & Analytics P1) — never a past season tab. When the upcoming season is a
  // real row rather than the synthetic chip, "viewing it" means the selected real row's
  // season matches, not the (now nonexistent) index -1.
  const isViewingCurrentSeason = !upcomingSeason && clampedIndex === 0;
  const isViewingUpcomingSeason = hasUpcomingChip
    ? clampedIndex === -1
    : upcomingSeasonHasRealRow && active?.season === upcomingSeason;
  const showNextGame = !!nextGame?.opponent && (isViewingCurrentSeason || isViewingUpcomingSeason);

  // Coach badge — season-scoped, keyed off the active season row (docs/superpowers/
  // specs/2026-07-14-season-scoped-head-coach-design.md). Derived once instead of four
  // near-duplicate <CoachBadge> call sites that each recomputed the same name/meta pair
  // for a different index/incomingCoach combination.
  const coachBadge = active?.coach
    ? {
        name: active.coach.name,
        meta: `HEAD COACH · ${ordinal(active.coach.experience).toUpperCase()} SEASON`,
      }
    : clampedIndex === -1 && incomingCoach
      ? { name: incomingCoach.name, meta: 'HEAD COACH · INCOMING' }
      : clampedIndex === -1 && !incomingCoach && seasons[0]?.coach
        ? {
            name: seasons[0].coach.name,
            meta: `HEAD COACH · ${ordinal(seasons[0].coach.experience + 1).toUpperCase()} SEASON`,
          }
        : clampedIndex === -2 && incomingCoach
          ? { name: incomingCoach.name, meta: 'HEAD COACH · INCOMING' }
          : null;

  const nextSeasonLabel = upcomingSeason
    ? String(upcomingSeason)
    : seasons[0]
      ? String(seasons[0].season + 1)
      : 'NEW';

  const record = active
    ? active.overallTies
      ? `${active.overallWins}-${active.overallLosses}-${active.overallTies}`
      : `${active.overallWins}-${active.overallLosses}`
    : null;
  const diff = active?.pointDifferential ?? 0;
  const diffLabel = diff > 0 ? `+${diff}` : String(diff);
  const diffColor = diff > 0 ? uiAccent : diff < 0 ? uiTokens.statusInjured : uiTokens.textMuted;
  const gamesPlayed = active ? active.overallWins + active.overallLosses + active.overallTies : 0;
  // Stub/upcoming team_stats rows can exist before a season starts. With every team at
  // 0 games and 0 points, ranking those rows makes everyone look "first" at stats that
  // have not happened yet, so rank context starts only after a real game is recorded.
  const activeRanks = active && gamesPlayed > 0 ? leagueRanksBySeason?.[active.season] : undefined;
  const lastRank = teams.length;

  // Resolve each section's metrics against the selected season, dropping any whose source
  // column is missing (invariant 6 — an absent row, never a zeroed one).
  const activeMetrics = active?.matchupMetrics;
  const metricSections = METRIC_SECTIONS.map((section) => ({
    title: section.title,
    metrics: activeMetrics
      ? section.metrics.flatMap((spec) => {
          const value = spec.value(activeMetrics);
          return value === undefined
            ? []
            : [{ spec, display: spec.format(value), rank: activeRanks?.[spec.rank] }];
        })
      : [],
  }));
  // At a one-game sample the numbers still show but nothing is ranked — a league position
  // off a single game is noise presented as fact. Same posture as Compare's isThinSample.
  const showMetricRanks = gamesPlayed > 1;

  return (
    <TeamPageShell {...shellProps}>
      <div
        className="relative"
        style={{ minHeight: '100dvh', background: uiTokens.bg, color: uiTokens.textPrimary }}>
        {header}

        {/* Season picker trigger — a dropdown/sheet instead of the old horizontal chip
          row, which stopped scaling once a full ESPN backfill can put 20+ real seasons
          on one team (2026-08-19-espn-full-history-team-stats-design.md). Same visual
          language as the SCHEDULE tab's season picker trigger (History icon, label,
          chevron). */}
        <div
          className="flex items-center gap-2 px-2.5 py-2.5"
          style={{
            borderBottom: `1px solid ${uiTokens.borderStrong}`,
            background: uiTokens.bgFilterbar,
          }}>
          <button
            type="button"
            onClick={() => setSeasonSheetOpen(true)}
            aria-label="Choose season"
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
            style={{ touchAction: 'manipulation' }}>
            <History size={12} color={uiTokens.textFaint} />
            <span
              className="font-bold tracking-[0.1em]"
              style={{ color: uiTokens.textPrimary, fontSize: typeScale.caption }}>
              {activeSeasonLabel}
            </span>
            <ChevronDown size={12} color={uiTokens.textFaint} />
          </button>
          {clampedIndex === -1 && <UpcomingBadge selected={false} uiAccent={uiAccent} />}
        </div>

        {/* Team + coach — see coachBadge's derivation above for the season-scoped
          precedence (active season's coach, then the incoming/carried-forward coach for
          the upcoming-season and incoming-coach chips). */}
        <div className="px-5 pt-[18px]">
          <div
            className="font-bold tracking-[0.1em]"
            style={{ color: uiTokens.textFaint, fontSize: typeScale.label }}>
            {team.city.toUpperCase()} {team.name.toUpperCase()}
          </div>
          {coachBadge && (
            <CoachBadge name={coachBadge.name} meta={coachBadge.meta} uiAccent={uiAccent} />
          )}
        </div>

        {active ? (
          <>
            {/* Hero record */}
            <div
              className="mt-0.5 flex items-baseline justify-between px-5 pb-[18px] pt-2"
              style={{ borderBottom: `1px dashed ${uiTokens.borderInput}` }}>
              <div className="text-[52px] font-bold leading-none tracking-[-0.02em]">{record}</div>
              <div className="text-right">
                {displayStreak(active.streak) && (
                  <div className="font-bold" style={{ color: uiAccent, fontSize: typeScale.title }}>
                    {displayStreak(active.streak)}
                  </div>
                )}
                {activeRanks?.winPercent && (
                  <div
                    className="font-bold"
                    style={{ color: uiTokens.textMuted, fontSize: typeScale.label }}>
                    {rankLabel(activeRanks.winPercent, lastRank, 'overall')}
                  </div>
                )}
                {/* Playoff status only for completed seasons — an upcoming or
                    in-progress season has no playoff outcomes yet, so the line
                    would falsely claim "MISSED PLAYOFFS" (playoffSeed is 0 for
                    stub rows with no data). */}
                {active.season < currentSeason && (
                  <div style={{ color: uiTokens.textFaint, fontSize: typeScale.label }}>
                    {isPlayoffSeed(active.playoffSeed, active.season)
                      ? `SEED ${active.playoffSeed} · ${team.conference}`
                      : `MISSED PLAYOFFS · ${team.conference}`}
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown table */}
            <div className="px-5">
              <table className="mt-1.5 w-full border-collapse text-xs">
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${uiTokens.borderStrong}` }}>
                    <StatCell label="HOME" value={wl(active.homeWins, active.homeLosses)} />
                    <td className="w-6" />
                    <StatCell label="ROAD" value={wl(active.roadWins, active.roadLosses)} />
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${uiTokens.borderStrong}` }}>
                    <StatCell label="DIV" value={wl(active.divisionWins, active.divisionLosses)} />
                    <td className="w-6" />
                    <StatCell
                      label="CONF"
                      value={wl(active.conferenceWins, active.conferenceLosses)}
                    />
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${uiTokens.borderStrong}` }}>
                    <StatCell
                      label={
                        <Tooltip content="Total points scored by the team">
                          <span>PTS FOR</span>
                        </Tooltip>
                      }
                      value={String(active.pointsFor)}
                      rank={rankLabel(activeRanks?.pointsFor, lastRank, 'most')}
                    />
                    <td className="w-6" />
                    <StatCell
                      label={
                        <Tooltip content="Total points scored against the team">
                          <span>PTS AGAINST</span>
                        </Tooltip>
                      }
                      value={String(active.pointsAgainst)}
                      rank={rankLabel(activeRanks?.pointsAgainst, lastRank, 'least')}
                    />
                  </tr>
                  <tr>
                    <StatCell
                      label="DIFF"
                      value={diffLabel}
                      color={diffColor}
                      rank={rankLabel(activeRanks?.pointDifferential, lastRank, 'most')}
                    />
                    <td className="w-6" />
                    {/* Turnover margin is a team-level signed number like DIFF, not a
                      unit metric, so it belongs beside it rather than under a section
                      heading — and this cell was previously empty. */}
                    {active.matchupMetrics?.turnoverMargin !== undefined ? (
                      <StatCell
                        label="TO MARGIN"
                        value={signed(0)(active.matchupMetrics.turnoverMargin)}
                        color={
                          active.matchupMetrics.turnoverMargin > 0
                            ? uiAccent
                            : active.matchupMetrics.turnoverMargin < 0
                              ? uiTokens.statusInjured
                              : uiTokens.textMuted
                        }
                        rank={
                          showMetricRanks
                            ? rankLabel(activeRanks?.turnoverMargin, lastRank, 'most')
                            : undefined
                        }
                      />
                    ) : (
                      <td colSpan={2} />
                    )}
                  </tr>
                  {active.passingYards !== undefined && (
                    <tr style={{ borderTop: `1px solid ${uiTokens.borderInput}` }}>
                      <StatCell
                        label={
                          <Tooltip content="Total team passing yards">
                            <span>PASS YDS</span>
                          </Tooltip>
                        }
                        value={String(active.passingYards)}
                        rank={rankLabel(activeRanks?.passingYards, lastRank, 'most')}
                      />
                      <td className="w-6" />
                      <StatCell
                        label={
                          <Tooltip content="Total team rushing yards">
                            <span>RUSH YDS</span>
                          </Tooltip>
                        }
                        value={String(active.rushingYards ?? '—')}
                        rank={rankLabel(activeRanks?.rushingYards, lastRank, 'most')}
                      />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : clampedIndex === -1 && upcomingSeason ? (
          // Upcoming season view — shown for ALL teams during the off-season, not just
          // new-coach teams (Stats & Analytics P2). Degrade instead of faking a 0-0
          // record (invariant 6) — there are no stats to show yet.
          <DegradedHero
            heading={`${upcomingSeason} season upcoming`}
            subline="No games played yet this season"
            footerLabel={`${upcomingSeason} SEASON · NOT YET STARTED`}
          />
        ) : (
          // No season stats for an incoming coach yet — degrade instead of faking a 0-0
          // record (invariant 6).
          <DegradedHero
            heading="New head coach"
            subline="No games played yet this season."
            footerLabel={`${nextSeasonLabel} SEASON · NOT YET STARTED`}
          />
        )}

        {/* NEXT GAME card (design spec 5a). Only when viewing the current/upcoming season
          tab (never a past season) and there's an unplayed game with a resolved
          opponent. */}
        {showNextGame && nextGame && nextGame.opponent && (
          <div className="px-[18px] pt-3.5">
            <div
              className="flex items-center justify-between rounded-2xl px-3.5 py-3"
              style={{ background: uiTokens.surfaceRaised, border: `1px solid ${uiAccent}33` }}>
              <div>
                <div
                  className="font-bold tracking-[0.08em]"
                  style={{ color: uiTokens.textMuted, fontSize: typeScale.micro }}>
                  NEXT GAME · WEEK {nextGame.week}
                </div>
                <div
                  className="mt-[3px] font-extrabold"
                  style={{ color: uiTokens.textPrimary, fontSize: typeScale.title }}>
                  {nextGame.isHome ? 'vs' : '@'} {nextGame.opponent.abbrev}
                  {nextGame.date ? ` · ${formatGameDate(nextGame.date)}` : ''}
                </div>
              </div>
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg font-black"
                style={{
                  background: nextGame.opponent.colors.primary,
                  border: `1px solid ${nextGame.opponent.colors.secondary}`,
                  color: readableTextOn(nextGame.opponent.colors.primary),
                  fontSize: typeScale.micro,
                }}>
                {nextGame.opponent.abbrev}
              </div>
            </div>
          </div>
        )}

        {/* Team metrics — the breakdown table's language continued, grouped by unit.
          Placed after NEXT GAME so the hero block keeps its existing adjacency, and
          before ROSTER LEADERS per the approved design. */}
        {metricSections.map((section) => (
          <MetricSection
            key={section.title}
            title={section.title}
            metrics={section.metrics}
            showRanks={showMetricRanks}
            lastRank={lastRank}
          />
        ))}

        {leaderRows.length > 0 && leaders && (
          <div className="px-5 pb-7 pt-1">
            <SectionLabel className="px-0 mb-2">ROSTER LEADERS</SectionLabel>
            {/* Card doesn't fit here: needs rounded-2xl + overflow-hidden clip + zero
              padding (rows supply their own), none of which Card's API exposes
              (rounded-3xl only, no clip variant, padding=16 default) — RowCardList
              instead, same deviation pattern as PlayerCard's task. */}
            <RowCardList
              rowPaddingY="py-3.5"
              rows={leaderRows.map(({ label, leader }) => ({
                key: label,
                left: (
                  <div className="min-w-0">
                    <div
                      className="font-bold tracking-[0.06em]"
                      style={{ color: uiAccent, fontSize: typeScale.caption }}>
                      {label}
                    </div>
                    <div
                      className="mt-1 truncate text-[17px] font-extrabold leading-tight"
                      style={{ color: uiTokens.textPrimary }}>
                      {leader.name}
                    </div>
                  </div>
                ),
                right: (
                  <div
                    className="shrink-0 text-right font-semibold"
                    style={{ color: uiTokens.textMuted, maxWidth: 170, fontSize: typeScale.body }}>
                    {leader.line}
                  </div>
                ),
              }))}
            />
          </div>
        )}

        <BottomSheet isOpen={seasonSheetOpen} onClose={() => setSeasonSheetOpen(false)}>
          <TeamStatsSeasonSheet
            entries={seasonEntries}
            activeIndex={clampedIndex}
            accent={uiAccent}
            onSelect={(i) => {
              setIndex(i);
              setSeasonSheetOpen(false);
            }}
            onClose={() => setSeasonSheetOpen(false)}
          />
        </BottomSheet>
      </div>
    </TeamPageShell>
  );
}
