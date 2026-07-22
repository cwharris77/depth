'use client';

// Desktop-only left rail (hidden below `xl` — see lib/use-media-query.ts for the one
// breakpoint). Persistent navigation for wide screens (Wide-screen responsive multi-panel
// ticket; layout from the Claude Design "Depth Wide Desktop" mock): the full team list
// with the current team checked, plus the global destinations (uniform archive,
// sign-in/account) that live in the mobile NavDrawer. On desktop the rail replaces both
// the drawer and the header team-switcher's *browse* role — the header pill stays for
// search (NavSwitcher's player/team command palette). Switching teams preserves the
// active page, so picking a team from /schedule lands on the new team's /schedule.
import { colors as uiTokens } from '@/components/ui/tokens';
import SectionLabel from '@/components/ui/SectionLabel';
import { readableTextOn } from '@/lib/colors';
import type { TeamMeta } from '@/lib/roster-source';
import { useUser } from '@/lib/use-user';
import { Check, Grid, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import DepthMark from './DepthMark';

export type TeamPageKey = 'roster' | 'schedule' | 'stats';

function teamHref(teamId: string, page: TeamPageKey): string {
  return page === 'roster' ? `/team/${teamId}` : `/team/${teamId}/${page}`;
}

// Conference → division → city, so the list reads in stable league order rather than
// jumping around alphabetically across the whole league.
function sortTeams(teams: TeamMeta[]): TeamMeta[] {
  return [...teams].sort(
    (a, b) =>
      a.conference.localeCompare(b.conference) ||
      a.division.localeCompare(b.division) ||
      a.city.localeCompare(b.city)
  );
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

  // Keep the current team's row visible in the scrollable list (32 rows overflow the
  // rail). 'nearest' avoids yanking the list around when it's already on screen; on
  // mobile the rail is display:none, so scrollIntoView is a no-op there.
  const currentRowRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [team.id]);

  const selectTeam = (t: TeamMeta, e: React.MouseEvent) => {
    // Let modifier/middle clicks fall through to the <Link>'s native open-in-new-tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (isPending || t.id === team.id) return;
    startTransition(() => router.push(teamHref(t.id, activePage)));
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
      <SectionLabel className="px-2 pb-2">TEAMS</SectionLabel>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {sortTeams(teams).map((t) => {
          const isCurrent = t.id === team.id;
          return (
            <Link
              key={t.id}
              ref={isCurrent ? currentRowRef : undefined}
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
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className="truncate text-xs font-bold"
                  style={{ color: uiTokens.textPrimary }}>
                  {t.city} {t.name}
                </span>
                <span className="text-[10px]" style={{ color: uiTokens.textMuted }}>
                  {t.conference} {t.division}
                </span>
              </span>
              {isCurrent && <Check size={13} color={t.colors.uiAccent} strokeWidth={3} />}
            </Link>
          );
        })}
      </div>
      <div
        className="mt-3.5 flex flex-col gap-0.5 pt-3.5"
        style={{ borderTop: `1px solid ${uiTokens.borderSubtle}` }}>
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
