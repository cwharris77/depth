'use client';

// Desktop-only left rail (hidden below `xl` — see lib/use-media-query.ts for the one
// breakpoint). Persistent navigation for wide screens (Wide-screen responsive multi-panel
// ticket; layout from the Claude Design "Depth Wide Desktop" mock): search over teams and
// players, the full team list grouped by conference/division (same sectioning as
// NavSwitcher's idle browse) with the current team checked, plus the global destinations
// (compare teams, uniform archive, sign-in/account) that live in the mobile NavDrawer. On
// desktop the rail fully replaces the drawer, the header's team-switcher pill, AND the
// NavSwitcher sheet (all mobile-only) — including NavSwitcher's "Compare teams" entry row
// (Decisions table "Entry point" in the compare-view spec), which is why that link lives
// here too: typing in the search field swaps the grouped list for combined player/team
// results in place. Switching teams preserves the active page; picking a player deep-links
// to their roster page via `?player=` (OpenPlayerFromQuery opens the card there), which
// works uniformly from roster, schedule, and stats.
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import SectionLabel from '@/components/ui/SectionLabel';
import { colors as uiTokens } from '@/components/ui/tokens';
import { readableTextOn } from '@/lib/colors';
import type { TeamMeta } from '@/lib/roster-source';
import type { PlayerHit } from '@/lib/search';
import { useUser } from '@/lib/use-user';
import { Check, Columns2, Grid, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import DepthMark from './DepthMark';

export type TeamPageKey = 'roster' | 'schedule' | 'stats';

function teamHref(teamId: string, page: TeamPageKey): string {
  return page === 'roster' ? `/team/${teamId}` : `/team/${teamId}/${page}`;
}

// Conference → division sections in league order, cities alphabetical within each — the
// same grouping NavSwitcher's idle browse uses, so the two team lists read identically.
const CONFERENCE_ORDER = ['AFC', 'NFC'] as const;
const DIVISION_ORDER = ['East', 'North', 'South', 'West'] as const;

function groupTeams(teams: TeamMeta[]) {
  return CONFERENCE_ORDER.flatMap((conference) =>
    DIVISION_ORDER.map((division) => ({
      label: `${conference} ${division.toUpperCase()}`,
      teams: teams
        .filter((t) => t.conference === conference && t.division === division)
        .sort((a, b) => a.city.localeCompare(b.city)),
    }))
  ).filter((g) => g.teams.length > 0);
}

export default function TeamRail({
  team,
  teams,
  activePage,
  accent,
}: {
  team: TeamMeta;
  teams: TeamMeta[];
  activePage: TeamPageKey;
  accent: string;
}) {
  const router = useRouter();
  // Same useTransition guard as NavSwitcher: hold the current page mounted (rows
  // disabled) until the destination is ready, instead of flashing a loading skeleton.
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const { user } = useUser();
  // Carry the current page as ?next= so signing in returns here — same pattern as
  // NavDrawer's sign-in link.
  const signInHref =
    pathname && pathname !== '/signin' ? `/signin?next=${encodeURIComponent(pathname)}` : '/signin';

  // Rail search — the desktop home of NavSwitcher's dual team/player search. Teams
  // filter locally; players hit /api/players/search debounced, aborted on the next
  // keystroke so a slow earlier response can't clobber a newer one (same pattern as
  // NavSwitcher). Deliberately lighter than the mobile palette: click (or Enter for the
  // top hit) activates, Escape clears — no arrow-key highlight state.
  const [query, setQuery] = useState('');
  const [playerResults, setPlayerResults] = useState<PlayerHit[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const teamResults = searching
    ? teams.filter(
        (t) =>
          t.city.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.abbrev.toLowerCase().includes(q)
      )
    : [];

  useEffect(() => {
    if (!searching) {
      setPlayerResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPlayersLoading(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setPlayerResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setPlayerResults([]);
      } finally {
        setPlayersLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searching]);

  // Keep the current team's row visible in the scrollable list (32 rows overflow the
  // rail). 'nearest' avoids yanking the list around when it's already on screen; on
  // mobile the rail is display:none, so scrollIntoView is a no-op there.
  const currentRowRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [team.id]);

  const selectTeam = (t: TeamMeta, e?: React.MouseEvent) => {
    // Let modifier/middle clicks fall through to the <Link>'s native open-in-new-tab.
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) return;
    e?.preventDefault();
    if (isPending) return;
    setQuery('');
    if (t.id === team.id) return;
    startTransition(() => router.push(teamHref(t.id, activePage)));
  };

  // Always the `?player=` deep link, even for the current team: it lands on the roster
  // page where OpenPlayerFromQuery opens the card, which behaves identically from the
  // roster, schedule, and stats pages — no per-page selection wiring through the shell.
  const selectPlayer = (hit: PlayerHit) => {
    if (isPending) return;
    setQuery('');
    startTransition(() => router.push(`/team/${hit.team.id}?player=${hit.id}`));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
    } else if (e.key === 'Enter') {
      const top = playerResults[0] ?? teamResults[0];
      if (!top) return;
      if ('position' in top) selectPlayer(top);
      else selectTeam(top);
    }
  };

  const nothingFound = searching && !playersLoading && !playerResults.length && !teamResults.length;

  const teamRow = (t: TeamMeta) => {
    const isCurrent = t.id === team.id;
    return (
      <Link
        key={t.id}
        ref={isCurrent && !searching ? currentRowRef : undefined}
        href={teamHref(t.id, activePage)}
        aria-disabled={isPending}
        aria-current={isCurrent ? 'page' : undefined}
        onClick={(e) => selectTeam(t, e)}
        className="flex items-center gap-2.5 rounded-[10px] px-2 py-2"
        style={{
          background: isCurrent ? `${t.colors.uiAccent}14` : 'transparent',
          pointerEvents: isPending ? 'none' : undefined,
          opacity: isPending ? 0.6 : 1,
        }}>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
          style={{
            background: t.colors.primary,
            border: `1px solid ${t.colors.secondary}`,
            color: readableTextOn(t.colors.primary),
          }}>
          {t.abbrev}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-xs font-bold"
          style={{ color: uiTokens.textPrimary }}>
          {t.city} {t.name}
        </span>
        {isCurrent && <Check size={13} color={t.colors.uiAccent} strokeWidth={3} />}
      </Link>
    );
  };

  return (
    <div
      className="hidden xl:flex min-h-0 flex-col px-3 pb-4 pt-5"
      style={{
        background: uiTokens.bgDrawer,
        borderRight: `1px solid ${uiTokens.borderDrawer}`,
      }}>
      <Link href="/" className="px-2 pb-4 w-fit" aria-label="Depth home">
        <DepthMark color={accent} />
      </Link>
      <div className="pb-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search teams or players"
          accent={accent}
          ariaLabel="Search teams or players"
        />
      </div>
      {/* scrollbar-width: none — the rail is a nav surface, not a document; a visible
          scrollbar beside the field reads as noise (same suppression as TeamStatsView's
          season strip). */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}>
        {!searching ? (
          groupTeams(teams).map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5 pb-2">
              <SectionLabel className="px-2 pb-1 pt-1.5">{group.label}</SectionLabel>
              {group.teams.map(teamRow)}
            </div>
          ))
        ) : nothingFound ? (
          <div className="px-2 py-4 text-xs" style={{ color: uiTokens.textMuted }}>
            No matches for &ldquo;{query.trim()}&rdquo;
          </div>
        ) : (
          <>
            {playerResults.length > 0 && (
              <div className="flex flex-col gap-0.5 pb-2">
                <SectionLabel className="px-2 pb-1 pt-1.5">PLAYERS</SectionLabel>
                {playerResults.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => selectPlayer(hit)}
                    className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-left"
                    style={{ opacity: isPending ? 0.6 : 1 }}>
                    <Avatar photoUrl={hit.photoUrl} name={hit.name} size={28} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className="truncate text-xs font-bold"
                        style={{ color: uiTokens.textPrimary }}>
                        {hit.name}
                      </span>
                      <span className="truncate text-[10px]" style={{ color: uiTokens.textMuted }}>
                        {hit.position} · {hit.team.name} · #{hit.number}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {teamResults.length > 0 && (
              <div className="flex flex-col gap-0.5 pb-2">
                <SectionLabel className="px-2 pb-1 pt-1.5">TEAMS</SectionLabel>
                {teamResults.map(teamRow)}
              </div>
            )}
          </>
        )}
      </div>
      <div
        className="mt-3.5 flex flex-col gap-0.5 pt-3.5"
        style={{ borderTop: `1px solid ${uiTokens.borderSubtle}` }}>
        <Link
          href="/compare"
          className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-xs font-bold"
          style={{ color: uiTokens.textSecondary }}>
          <Columns2 size={15} color={uiTokens.textMuted} /> Compare teams
        </Link>
        <Link
          href="/uniforms"
          className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-xs font-bold"
          style={{ color: uiTokens.textSecondary }}>
          <Grid size={15} color={uiTokens.textMuted} /> Uniform archive
        </Link>
        <Link
          href={signInHref}
          className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-xs font-bold"
          style={{ color: uiTokens.textSecondary }}>
          <User size={15} color={uiTokens.textMuted} /> {user ? 'Account' : 'Sign in'}
        </Link>
      </div>
    </div>
  );
}
