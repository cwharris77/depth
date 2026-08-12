'use client';

// Regular-season schedule for one team (design spec 5a's SCHEDULE tab). A weekly card
// grid — one card per week: opponent code chip in the opponent's colors, date, HOME/AWAY
// badge for upcoming games or the final score + W/L/T for played ones, with BYE weeks
// called out. Client component receiving one team's already-resolved schedule as a prop
// (invariant 5); it never imports all-32 data — opponent colors are baked into the prop.
//
// Season browsing (docs/superpowers/specs/2026-08-10-past-season-schedule-view-design.md):
// the prerendered `schedule` prop is the default (current/latest) season; a past season
// selected from the SeasonSheet bottom sheet is fetched client-side from the schedule
// season API route and shown in the same grid — a completed season is all-played results,
// so no separate "history" card layout exists. `?season=` stays in the URL (shareable,
// matching the depth chart's Phase D1 precedent); the default view is `null`.
import type { TeamMeta } from '@/lib/roster-source';
import type { TeamSchedule, TeamScheduleGame } from '@/lib/types';
import { gameResultColor, readableTextOn } from '@/lib/colors';
import { formatGameDate } from '@/lib/format';
import { normalizeViewedSeason } from '@/lib/schedule';
import { useTeamScheduleSeason } from '@/lib/use-team-schedule-season';
import { ChevronDown, History } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import ApplySeasonFromQuery from './ApplySeasonFromQuery';
import BottomSheet from './BottomSheet';
import SchedulePanel from './SchedulePanel';
import SeasonSheet from './SeasonSheet';
import TeamPageHeader from './TeamPageHeader';
import TeamPageShell from './TeamPageShell';
import Badge from '@/components/ui/Badge';
import { colors as uiTokens } from '@/components/ui/tokens';
import { useKitColors } from '@/lib/use-kit-colors';

interface Props {
  team: TeamMeta;
  teams: TeamMeta[];
  schedule: TeamSchedule | null;
  // Whether the default view is the upcoming season (offseason) — shows an "Upcoming"
  // badge that applies only to the default view, never a past season.
  isUpcoming?: boolean;
  // The season the SeasonSheet lists as "current" — the season the default view shows
  // (server-computed in the page, see its comment).
  currentSeason: number;
  // SeasonSheet's lower bound (SEASONS_MIN) — the coverage floor for the picker rows.
  minSeason: number;
}

function GameCard({
  game,
  teamId,
  uiAccent,
  isPastSeason,
}: {
  game: TeamScheduleGame;
  teamId: string;
  uiAccent: string;
  // A completed season's games are all in the past — a null `result` there is missing
  // data, not an upcoming game, so it must not render the HOME/AWAY "upcoming" badge.
  isPastSeason: boolean;
}) {
  if (game.isBye) {
    return (
      <div
        className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center"
        style={{ border: `1px dashed ${uiTokens.borderInput}` /* nearest token to 0.25 alpha */ }}>
        <div
          className="text-[9px] font-bold tracking-[0.06em]"
          style={{ color: uiTokens.textFaint }}>
          WEEK {game.week}
        </div>
        <div className="text-xs font-black" style={{ color: uiTokens.textMuted }}>
          BYE
        </div>
      </div>
    );
  }

  const opp = game.opponent;
  const played = game.result !== null;
  const content = (
    <>
      <div className="text-[9px] font-bold tracking-[0.06em]" style={{ color: uiTokens.textFaint }}>
        WEEK {game.week}
      </div>
      <div
        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[9px] font-black"
        style={
          opp
            ? {
                background: opp.colors.primary,
                border: `1px solid ${opp.colors.secondary}`,
                color: readableTextOn(opp.colors.primary),
              }
            : {
                background: uiTokens.surfaceChip /* nearest token to 0.08 alpha */,
                color: uiTokens.textMuted,
              }
        }>
        {opp?.abbrev ?? '—'}
      </div>
      <div className="text-[11px] font-extrabold" style={{ color: uiTokens.textPrimary }}>
        {game.isHome ? 'vs' : '@'} {opp?.abbrev ?? '—'}
      </div>
      {played ? (
        <div
          className="text-[10px] font-bold"
          style={{ color: gameResultColor(game.result as 'W' | 'L' | 'T') }}>
          {game.result} {game.teamScore}-{game.oppScore}
        </div>
      ) : isPastSeason ? (
        <div className="text-[10px] font-bold" style={{ color: uiTokens.textMuted }}>
          No result
        </div>
      ) : (
        <>
          <div className="text-[10px] font-bold" style={{ color: uiTokens.textMuted }}>
            {formatGameDate(game.date)}
          </div>
          <Badge kind="tag" accent={game.isHome ? uiAccent : uiTokens.textMuted}>
            {game.isHome ? 'HOME' : 'AWAY'}
          </Badge>
        </>
      )}
    </>
  );

  const cardClass =
    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.05]';
  const cardStyle = {
    background: uiTokens.surfaceCard2,
    border: `1px solid ${uiTokens.borderDefault}`,
  };

  if (!opp)
    return (
      <div className={cardClass} style={cardStyle}>
        {content}
      </div>
    );

  return (
    <Link
      href={`/compare?a=${teamId}&b=${opp.id}&from=schedule&scheduleTeam=${teamId}`}
      className={cardClass}
      style={cardStyle}>
      {content}
    </Link>
  );
}

export default function TeamScheduleView({
  team,
  teams,
  schedule,
  isUpcoming,
  currentSeason,
  minSeason,
}: Props) {
  // Picks up whichever kit is active on the roster page for this team (lib/use-kit-colors.ts)
  // instead of always showing the default team colors — falls back to team.colors when
  // nothing was ever picked this session.
  const colors = useKitColors(team);
  const { uiAccent } = colors;

  // Season browsing: `viewedSeason` null is the default view (the prerendered `schedule`
  // prop). A past season picked from the sheet (or restored from a shared `?season=`
  // link via ApplySeasonFromQuery) drives the client fetch below; `normalizeViewedSeason`
  // clamps a malformed/out-of-range param to the default view (invariant 6) and treats the
  // current season itself as the default (no redundant fetch).
  const router = useRouter();
  const pathname = usePathname();
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false);
  const [viewedSeason, setViewedSeason] = useState<number | null>(null);
  // This component persists across team switches (the desktop rail stays on the schedule
  // tab while swapping the [id] segment — same non-remount behavior DepthChartField's
  // team-change resets handle), so reset the viewed season to the default when the team
  // changes. Render-time reset, not an effect, same pattern as the depth chart's
  // seasonSelection/useKit resets — this only needs to mirror the team.id prop.
  const [viewedSeasonTeamId, setViewedSeasonTeamId] = useState(team.id);
  if (viewedSeasonTeamId !== team.id) {
    setViewedSeasonTeamId(team.id);
    setViewedSeason(null);
  }
  const {
    schedule: pastSchedule,
    loading,
    notFound,
  } = useTeamScheduleSeason(team.id, viewedSeason);

  const applySeason = (season: number | null) =>
    setViewedSeason(normalizeViewedSeason(season, currentSeason, minSeason));

  const selectSeason = (next: number | null) => {
    setSeasonSheetOpen(false);
    setViewedSeason(next);
    // Keep the selection shareable in the URL, same as the depth chart's `?season=`
    // (kept, never stripped). The default view is the clean path.
    const url = next === null ? pathname : `${pathname}?season=${next}`;
    router.replace(url, { scroll: false });
  };

  // Never render a stale season's grid while a new one is in flight (invariant 16) —
  // the fetch states gate the content below. Returning to the default view is instant:
  // it's the already-prerendered `schedule` prop.
  const displaySchedule = viewedSeason === null ? schedule : pastSchedule;
  const showUpcoming = isUpcoming && viewedSeason === null;
  const viewedLabel = displaySchedule?.season ?? viewedSeason ?? currentSeason;
  // Anything shown via a season fetch (viewedSeason !== null) is, by construction, not
  // the live current season — normalizeViewedSeason already folds currentSeason into the
  // default (null) view, so a non-null viewedSeason is always strictly in the past.
  const isPastSeason = viewedSeason !== null;

  // The desktop aside (SchedulePanel) is a summary of `displaySchedule`, not gated by
  // `loading` like the main grid is — without this it would blank out and reappear on
  // every season switch, which reads as broken chrome even though the main content
  // handles its own loading state correctly. Render-time "keep last value" (same pattern
  // as the team-id reset above), not an effect: hold the last non-loading schedule and
  // only swap once the new one has actually landed.
  const [panelSchedule, setPanelSchedule] = useState<TeamSchedule | null>(displaySchedule);
  // The default view's data is a prop, never gated by `loading` (which only reflects the
  // past-season hook and can lag one render behind a team switch) — sync it immediately.
  if (
    viewedSeason === null
      ? panelSchedule !== displaySchedule
      : !loading && panelSchedule !== displaySchedule
  ) {
    setPanelSchedule(displaySchedule);
  }

  const header = (
    <div
      className="bg-background px-5 pb-3"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
      <TeamPageHeader team={team} teams={teams} colors={colors} activePage="schedule" />
    </div>
  );

  return (
    <TeamPageShell
      team={team}
      teams={teams}
      activePage="schedule"
      accent={uiAccent}
      aside={<SchedulePanel schedule={panelSchedule} accent={uiAccent} />}>
      <div
        className="relative bg-background"
        style={{ minHeight: '100dvh', color: uiTokens.textPrimary }}>
        {header}
        {/* Season label doubles as the picker trigger — always visible (including the
            degraded no-data states) so a past season is always reachable. */}
        <div className="px-[18px] pb-1 pt-[18px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSeasonSheetOpen(true)}
              aria-label="Choose season"
              className="-mx-1 flex items-center gap-1.5 rounded-md px-1"
              style={{ touchAction: 'manipulation' }}>
              <History size={12} color={uiTokens.textFaint} />
              <span
                className="text-[10px] font-bold tracking-[0.1em]"
                style={{ color: uiTokens.textFaint }}>
                {viewedLabel} SEASON
              </span>
              <ChevronDown size={12} color={uiTokens.textFaint} />
            </button>
            {showUpcoming && (
              <Badge kind="tag" accent={uiAccent}>
                UPCOMING
              </Badge>
            )}
          </div>
        </div>
        {loading ? (
          <p className="px-5 pb-6 pt-2 text-sm" style={{ color: uiTokens.textMuted }}>
            Loading {viewedSeason} season…
          </p>
        ) : notFound ? (
          <p className="px-5 pb-6 pt-2 text-sm" style={{ color: uiTokens.textMuted }}>
            No schedule available for the {team.name} in {viewedSeason}.
          </p>
        ) : displaySchedule && displaySchedule.games.length > 0 ? (
          /* Desktop's wider main column fits more weeks per row (multi-panel mock). */
          <div className="grid grid-cols-3 gap-2 px-3.5 pb-6 pt-2 xl:grid-cols-5 xl:gap-3">
            {displaySchedule.games.map((game) => (
              <GameCard
                key={game.week}
                game={game}
                teamId={team.id}
                uiAccent={uiAccent}
                isPastSeason={isPastSeason}
              />
            ))}
          </div>
        ) : (
          <p className="px-5 pb-6 pt-2 text-sm" style={{ color: uiTokens.textMuted }}>
            No schedule available for this team yet.
          </p>
        )}

        <BottomSheet isOpen={seasonSheetOpen} onClose={() => setSeasonSheetOpen(false)}>
          <SeasonSheet
            currentSeason={currentSeason}
            minSeason={minSeason}
            activeSeason={viewedSeason}
            accent={uiAccent}
            onSelect={selectSeason}
            onClose={() => setSeasonSheetOpen(false)}
          />
        </BottomSheet>

        <ApplySeasonFromQuery onApply={applySeason} />
      </div>
    </TeamPageShell>
  );
}
