'use client';

// Two-team compare (roadmap 5d + reunification pass — vault
// Projects/depth/specs/2026-07-07-compare-view-design.md and
// 2026-07-28-compare-page-reunification-design.md). Replaces the old
// TeamCompareTable.tsx + CompareTable.tsx pair, which each duplicated their own team
// pickers and had become mutually exclusive on the same route (PR #221 made the
// position-depth view unreachable from any entry point). One shared team-slot picker
// feeds two sections behind a Matchup/By-position segmented control; `pos`
// query-param PRESENCE (not a separate `view` param) is the single source of truth
// for which section is active — see the reunification spec's "Route/params"
// decision. The server (app/compare/page.tsx) resolves both team stats and both full
// rosters unconditionally once a/b are picked, precomputes per-position player
// groups there, and hands this component only the currently-selected position's two
// arrays plus a small `teaser` preview object — never a whole roster.
import FilterPill from '@/components/ui/FilterPill';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { colors as uiTokens } from '@/components/ui/tokens';
import { COMPARE_POSITIONS, type CompareTeaser } from '@/lib/compare';
import { formatLastName } from '@/lib/format';
import type { TeamMeta } from '@/lib/roster-source';
import type { Player, Position, TeamStats } from '@/lib/types';
import { useLastAccent } from '@/lib/use-last-accent';
import { ArrowLeft, ChevronRight, Columns2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import DepthMark from './DepthMark';
import FullScreenSheet from './FullScreenSheet';
import NavDrawer from './NavDrawer';
import NavSwitcher from './NavSwitcher';
import TeamPageShell from './TeamPageShell';

interface CompareViewProps {
  teams: TeamMeta[];
  teamA?: TeamMeta;
  teamB?: TeamMeta;
  statsA?: TeamStats;
  statsB?: TeamStats;
  positionsA?: Player[];
  positionsB?: Player[];
  position: Position;
  hasPos: boolean;
  teaser?: CompareTeaser;
  scheduleTeam?: TeamMeta;
}

type Slot = 'a' | 'b';
type Tab = 'matchup' | 'position';

function buildComparePath(
  a: string | undefined,
  b: string | undefined,
  pos: Position | undefined,
  scheduleTeamId: string | undefined
): string {
  const params = new URLSearchParams();
  if (a) params.set('a', a);
  if (b) params.set('b', b);
  if (pos) params.set('pos', pos);
  if (scheduleTeamId) {
    params.set('from', 'schedule');
    params.set('scheduleTeam', scheduleTeamId);
  }
  return `/compare?${params.toString()}`;
}

export default function CompareView({
  teams,
  teamA,
  teamB,
  statsA,
  statsB,
  positionsA,
  positionsB,
  position,
  hasPos,
  teaser,
  scheduleTeam,
}: CompareViewProps) {
  const router = useRouter();
  const [pickingSlot, setPickingSlot] = useState<Slot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const accent = useLastAccent();
  const tab: Tab = hasPos ? 'position' : 'matchup';

  const updateUrl = (next: { a?: string; b?: string; pos?: Position | null }) => {
    const nextPos = 'pos' in next ? (next.pos ?? undefined) : hasPos ? position : undefined;
    router.replace(
      buildComparePath(
        'a' in next ? next.a : teamA?.id,
        'b' in next ? next.b : teamB?.id,
        nextPos,
        scheduleTeam?.id
      ),
      { scroll: false }
    );
  };

  const both = teamA && teamB ? { a: teamA, b: teamB } : null;
  const sameTeam = both !== null && both.a.id === both.b.id;
  const pickedCount = [teamA, teamB].filter(Boolean).length;

  return (
    <TeamPageShell teams={teams} accent={accent}>
      <div
        className="relative px-4"
        style={{
          minHeight: '100dvh',
          background: uiTokens.bg,
          color: uiTokens.textPrimary,
          paddingTop: 'max(env(safe-area-inset-top), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        }}>
        <div className="mx-auto xl:max-w-2xl xl:pt-10">
          <div className="flex items-center justify-between xl:hidden">
            <DepthMark color={accent} onClick={() => setDrawerOpen(true)} />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${accent}1a`, border: `1px solid ${accent}40` }}>
              <Columns2 size={17} color={accent} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Compare teams</h1>
              <p className="mt-0.5 text-xs" style={{ color: uiTokens.textFaint }}>
                Season snapshot or position-by-position depth.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <TeamSlotButton team={teamA} onClick={() => setPickingSlot('a')} />
            <span
              className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
              style={{ background: uiTokens.surfaceChip, color: uiTokens.textFaint }}
              aria-hidden="true">
              VS
            </span>
            <TeamSlotButton team={teamB} onClick={() => setPickingSlot('b')} />
          </div>

          <SegmentedControl
            className="mt-5"
            fullWidth
            options={[
              { value: 'matchup', label: 'By Team' },
              { value: 'position', label: 'By position' },
            ]}
            value={tab}
            onChange={(value) => updateUrl({ pos: value === 'position' ? position : null })}
          />

          <div className="mt-5 pb-6">
            {tab === 'matchup' ? (
              <TeamMatchup
                both={both}
                pickedCount={pickedCount}
                statsA={statsA}
                statsB={statsB}
                sameTeam={sameTeam}
                teaser={teaser}
                onTeaserTap={() => teaser && updateUrl({ pos: teaser.position })}
              />
            ) : (
              <PositionDepth
                both={both}
                pickedCount={pickedCount}
                sameTeam={sameTeam}
                position={position}
                positionsA={positionsA}
                positionsB={positionsB}
                onPositionChange={(pos) => updateUrl({ pos })}
              />
            )}
          </div>

          {scheduleTeam && (
            <div className="pb-7">
              <Link
                href={`/team/${scheduleTeam.id}/schedule`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
                style={{
                  background: uiTokens.surfaceInput,
                  border: `1px solid ${uiTokens.borderInput}`,
                  color: uiTokens.textSecondary,
                  touchAction: 'manipulation',
                }}>
                <ArrowLeft size={16} />
                Back to schedule
              </Link>
            </div>
          )}
        </div>

        <FullScreenSheet isOpen={pickingSlot !== null}>
          <NavSwitcher
            teams={teams}
            onSelectPlayer={() => {}}
            onClose={() => setPickingSlot(null)}
            onPickTeam={(id) => {
              if (pickingSlot === 'a') updateUrl({ a: id });
              else if (pickingSlot === 'b') updateUrl({ b: id });
              setPickingSlot(null);
            }}
          />
        </FullScreenSheet>

        <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} accent={accent} />
      </div>
    </TeamPageShell>
  );
}

function TeamSlotButton({ team, onClick }: { team?: TeamMeta; onClick: () => void }) {
  if (!team) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 rounded-2xl px-4 py-5 text-center text-sm font-bold transition-colors duration-150 hover:bg-white/[0.03]"
        style={{
          border: `1px dashed ${uiTokens.borderInput}`,
          color: uiTokens.textFaint,
          touchAction: 'manipulation',
        }}>
        Pick a team
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        background: `${team.colors.uiAccent}1a`,
        border: `1px solid ${team.colors.uiAccent}55`,
        touchAction: 'manipulation',
      }}>
      <div
        className="text-[11px] font-bold tracking-widest"
        style={{ color: team.colors.uiAccent }}>
        {team.abbrev}
      </div>
      <div className="truncate text-sm font-bold" style={{ color: uiTokens.textPrimary }}>
        {team.city} {team.name}
      </div>
      <div
        className="mt-0.5 text-[10px] font-semibold opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ color: uiTokens.textFaint }}>
        Tap to change
      </div>
    </button>
  );
}

function ComparePrompt({ pickedCount, copy }: { pickedCount: number; copy: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center"
      style={{ border: `1px dashed ${uiTokens.borderSubtle}`, background: uiTokens.surfaceCard2 }}>
      <Columns2 size={22} color={uiTokens.textFaintest} />
      <p className="text-sm font-bold" style={{ color: uiTokens.textSecondary }}>
        {pickedCount === 0 ? 'Pick two teams to compare' : 'Pick one more team'}
      </p>
      <p className="max-w-[32ch] text-xs" style={{ color: uiTokens.textFaint }}>
        {copy}
      </p>
    </div>
  );
}

function SameTeamNote() {
  return (
    <p className="mb-2.5 text-xs font-semibold" style={{ color: uiTokens.textFaint }}>
      Same team on both sides
    </p>
  );
}

// --- Matchup tab ---

function record(stats?: TeamStats): string {
  if (!stats) return '—';
  return stats.overallTies
    ? `${stats.overallWins}-${stats.overallLosses}-${stats.overallTies}`
    : `${stats.overallWins}-${stats.overallLosses}`;
}

function wl(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

function StatLine({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div
      className="grid grid-cols-[1fr_70px_1fr] items-center gap-2 py-2.5 text-xs"
      style={{ borderTop: `1px solid ${uiTokens.borderSubtle}` }}>
      <div className="truncate text-right font-bold" style={{ color: uiTokens.textPrimary }}>
        {a}
      </div>
      <div className="text-center text-[10px] font-bold" style={{ color: uiTokens.textFaint }}>
        {label}
      </div>
      <div className="truncate font-bold" style={{ color: uiTokens.textPrimary }}>
        {b}
      </div>
    </div>
  );
}

function MatchupTeamHeader({ team, stats }: { team: TeamMeta; stats?: TeamStats }) {
  return (
    <div className="min-w-0 text-center">
      <div
        className="text-[11px] font-black tracking-widest"
        style={{ color: team.colors.uiAccent }}>
        {team.abbrev}
      </div>
      <div className="truncate text-xs font-bold" style={{ color: uiTokens.textPrimary }}>
        {team.city}
      </div>
      {stats && (
        <div className="mt-1 text-[10px] font-bold" style={{ color: uiTokens.textFaint }}>
          {stats.season}
        </div>
      )}
    </div>
  );
}

function DeepestRoomTeaser({
  teaser,
  teamA,
  teamB,
  onTap,
}: {
  teaser: CompareTeaser;
  teamA: TeamMeta;
  teamB: TeamMeta;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="mt-2.5 flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.03]"
      style={{
        border: `1px solid ${uiTokens.borderDefault}`,
        background: uiTokens.surfaceCard2,
        touchAction: 'manipulation',
      }}>
      <span className="flex -space-x-1.5 shrink-0">
        <span
          className="h-5 w-5 rounded-full"
          style={{ background: `${teamA.colors.uiAccent}33`, border: `2px solid ${uiTokens.bg}` }}
        />
        <span
          className="h-5 w-5 rounded-full"
          style={{ background: `${teamB.colors.uiAccent}33`, border: `2px solid ${uiTokens.bg}` }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[9px] font-bold uppercase tracking-wide"
          style={{ color: uiTokens.textFaintest }}>
          Deepest room · {teaser.position}
        </span>
        <span
          className="mt-0.5 block truncate text-xs font-bold"
          style={{ color: uiTokens.textPrimary }}>
          {teaser.topA ? formatLastName(teaser.topA.name) : '—'} vs{' '}
          {teaser.topB ? formatLastName(teaser.topB.name) : '—'} · {teaser.countA} vs{' '}
          {teaser.countB} deep
        </span>
      </span>
      <ChevronRight size={16} color={uiTokens.textFaint} className="shrink-0" />
    </button>
  );
}

function TeamMatchup({
  both,
  pickedCount,
  statsA,
  statsB,
  sameTeam,
  teaser,
  onTeaserTap,
}: {
  both: { a: TeamMeta; b: TeamMeta } | null;
  pickedCount: number;
  statsA?: TeamStats;
  statsB?: TeamStats;
  sameTeam: boolean;
  teaser?: CompareTeaser;
  onTeaserTap: () => void;
}) {
  if (!both) {
    return (
      <ComparePrompt
        pickedCount={pickedCount}
        copy="Their record, points, and home-road splits line up side by side."
      />
    );
  }
  return (
    <>
      {sameTeam && <SameTeamNote />}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ border: `1px solid ${uiTokens.borderDefault}` }}>
        <div className="grid grid-cols-[1fr_56px_1fr] items-center gap-2 px-3 py-4">
          <MatchupTeamHeader team={both.a} stats={statsA} />
          <div className="text-center text-[10px] font-black" style={{ color: uiTokens.textFaint }}>
            VS
          </div>
          <MatchupTeamHeader team={both.b} stats={statsB} />
        </div>
        <StatLine label="RECORD" a={record(statsA)} b={record(statsB)} />
        <StatLine
          label="PTS FOR"
          a={statsA ? String(statsA.pointsFor) : '—'}
          b={statsB ? String(statsB.pointsFor) : '—'}
        />
        <StatLine
          label="PTS AGAINST"
          a={statsA ? String(statsA.pointsAgainst) : '—'}
          b={statsB ? String(statsB.pointsAgainst) : '—'}
        />
        <StatLine
          label="HOME"
          a={statsA ? wl(statsA.homeWins, statsA.homeLosses) : '—'}
          b={statsB ? wl(statsB.homeWins, statsB.homeLosses) : '—'}
        />
        <StatLine
          label="ROAD"
          a={statsA ? wl(statsA.roadWins, statsA.roadLosses) : '—'}
          b={statsB ? wl(statsB.roadWins, statsB.roadLosses) : '—'}
        />
      </div>
      {teaser && (
        <DeepestRoomTeaser teaser={teaser} teamA={both.a} teamB={both.b} onTap={onTeaserTap} />
      )}
    </>
  );
}

// --- Position depth tab ---

function EmptyPositionState({ position }: { position: Position }) {
  return (
    <div
      className="rounded-2xl px-6 py-10 text-center text-sm font-semibold"
      style={{
        border: `1px solid ${uiTokens.borderDefault}`,
        background: uiTokens.surfaceCard2,
        color: uiTokens.textMuted,
      }}>
      Neither team lists a {position}
    </div>
  );
}

function CompareRankLegend({ teams }: { teams: [TeamMeta, TeamMeta] }) {
  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: uiTokens.textFaint }}>
      <span>Dot = row rank</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex -space-x-1">
          {teams.map((team) => (
            <span
              key={team.id}
              className="h-2 w-2 rounded-full"
              style={{ background: team.colors.uiAccent, border: `1px solid ${uiTokens.bg}` }}
            />
          ))}
        </span>
        Rank 1
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: uiTokens.textFaintest }} />
        Deeper
      </span>
    </div>
  );
}

function TeamHeaderCell({ team }: { team: TeamMeta }) {
  return (
    <div
      className="min-w-0 px-2 py-3 text-center"
      style={{ color: team.colors.uiAccent, background: `${team.colors.uiAccent}12` }}>
      <div className="text-xs font-black tracking-widest">{team.abbrev}</div>
      <div className="truncate text-[10px] font-semibold" style={{ color: uiTokens.textMuted }}>
        {team.city}
      </div>
    </div>
  );
}

function PlayerCell({ player, team, rank }: { player?: Player; team: TeamMeta; rank: number }) {
  if (!player) {
    return (
      <div
        className="flex items-center justify-center py-3"
        style={{ color: uiTokens.textFaintest }}>
        —
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5 px-1.5 py-3">
      <span
        role="img"
        aria-label={rank === 1 ? 'Rank 1' : `Depth rank ${rank}`}
        className="shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          background: rank === 1 ? team.colors.uiAccent : uiTokens.textFaintest,
        }}
      />
      <span className="min-w-0 truncate text-xs font-bold" style={{ color: uiTokens.textPrimary }}>
        <span className="font-normal" style={{ color: uiTokens.textFaint }}>
          #{player.number}
        </span>{' '}
        <span className="hidden min-[480px]:inline">{player.name}</span>
        <span className="inline min-[480px]:hidden">{formatLastName(player.name)}</span>
      </span>
    </div>
  );
}

function CompareRows({
  a,
  b,
  rowCount,
}: {
  a: { team: TeamMeta; players: Player[] };
  b: { team: TeamMeta; players: Player[] };
  rowCount: number;
}) {
  return (
    <>
      <CompareRankLegend teams={[a.team, b.team]} />
      <div
        className="overflow-hidden rounded-2xl"
        style={{ border: `1px solid ${uiTokens.borderDefault}` }}>
        <div
          className="grid grid-cols-[36px_1fr_1fr]"
          style={{ background: uiTokens.surfaceCard2 }}>
          <div />
          <TeamHeaderCell team={a.team} />
          <TeamHeaderCell team={b.team} />
        </div>
        {Array.from({ length: rowCount }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[36px_1fr_1fr] items-stretch"
            style={{
              borderTop: `1px solid ${uiTokens.borderSubtle}`,
              background: i % 2 === 1 ? uiTokens.surfaceCard2 : 'transparent',
            }}>
            <div className="flex items-center justify-center">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: uiTokens.surfaceChip, color: uiTokens.textFaint }}>
                {i + 1}
              </span>
            </div>
            <PlayerCell player={a.players[i]} team={a.team} rank={i + 1} />
            <PlayerCell player={b.players[i]} team={b.team} rank={i + 1} />
          </div>
        ))}
      </div>
    </>
  );
}

function PositionDepth({
  both,
  pickedCount,
  sameTeam,
  position,
  positionsA,
  positionsB,
  onPositionChange,
}: {
  both: { a: TeamMeta; b: TeamMeta } | null;
  pickedCount: number;
  sameTeam: boolean;
  position: Position;
  positionsA?: Player[];
  positionsB?: Player[];
  onPositionChange: (pos: Position) => void;
}) {
  const activePositionRef = useRef<HTMLSpanElement>(null);

  // useEffect: scrollIntoView is an imperative browser API with no render-phase
  // equivalent — need effect to keep active position visible as user taps filters.
  useEffect(() => {
    activePositionRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [position]);

  const rowCount = Math.max(positionsA?.length ?? 0, positionsB?.length ?? 0);
  const noPlayersEitherSide = both !== null && rowCount === 0;

  return (
    <>
      {sameTeam && <SameTeamNote />}
      <div className="relative">
        <div
          className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 pr-10 xl:mx-0 xl:flex-wrap xl:overflow-visible xl:px-0 xl:pb-0 xl:pr-0"
          style={{ scrollbarWidth: 'none' }}
          role="group"
          aria-label="Filter by position">
          {COMPARE_POSITIONS.map((pos) => (
            <span key={pos} ref={pos === position ? activePositionRef : undefined}>
              <FilterPill active={pos === position} onClick={() => onPositionChange(pos)}>
                {pos}
              </FilterPill>
            </span>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 -right-4 w-10 xl:hidden"
          style={{ background: `linear-gradient(to right, transparent, ${uiTokens.bg})` }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-5">
        {!both ? (
          <ComparePrompt
            pickedCount={pickedCount}
            copy="Their depth at the selected position lines up side by side, rank for rank."
          />
        ) : noPlayersEitherSide ? (
          <EmptyPositionState position={position} />
        ) : (
          <CompareRows
            a={{ team: both.a, players: positionsA ?? [] }}
            b={{ team: both.b, players: positionsB ?? [] }}
            rowCount={rowCount}
          />
        )}
      </div>
    </>
  );
}
