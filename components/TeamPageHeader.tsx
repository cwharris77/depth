'use client';

// Shared team-page top bar: hamburger menu trigger, team switcher pill (abbrev +
// chevron), and the ROSTER/SCHEDULE/STATS page switcher (design spec 5a). Used by
// both the field (components/DepthChartField.tsx) and the stats page
// (components/TeamStatsView.tsx) so moving between roster/schedule/stats reads as a
// tab change, not navigating away and back. Owns its own nav-drawer/switcher sheet
// state so callers don't have to wire it up per page. All three tabs are live routes:
// ROSTER (/team/[id]), SCHEDULE (/team/[id]/schedule), STATS (/team/[id]/stats).
import type { TeamMeta } from '@/lib/roster-source';
import type { Player, TeamColors } from '@/lib/types';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import DepthMark from './DepthMark';
import FullScreenSheet from './FullScreenSheet';
import NavDrawer from './NavDrawer';
import NavSwitcher from './NavSwitcher';
import { colors as uiTokens } from '@/components/ui/tokens';

const PAGE_TABS = [
  { key: 'roster', label: 'ROSTER' },
  { key: 'schedule', label: 'SCHEDULE' },
  { key: 'stats', label: 'STATS' },
] as const;

type PageKey = (typeof PAGE_TABS)[number]['key'];

export default function TeamPageHeader({
  team,
  teams,
  colors,
  activePage,
  currentTeamPlayers,
  onSelectPlayer,
}: {
  team: TeamMeta;
  teams: TeamMeta[];
  colors: TeamColors;
  activePage: PageKey;
  currentTeamPlayers?: Player[];
  onSelectPlayer?: (player: Player) => void;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ROSTER and STATS are a disjoint route tree from each other (not the same page
  // with different props, the way team-to-team nav is for DepthChartField), so a
  // plain <Link> between them would flash the destination's loading skeleton. Same
  // useTransition-guarded pattern TeamStatsView's old back-arrow used.
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = (href: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (isPending) return;
    startTransition(() => router.push(href));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <DepthMark color={colors.uiAccent} onClick={() => setDrawerOpen(true)} />
        {/* Team switcher trigger — styled as a visible pill, not plain text, so it
            reads as tappable. Labeled with team.abbrev (the existing short-name
            column) rather than city + mascot, compact enough to sit alongside the
            page switcher. */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Switch team or search players"
            className="flex items-center gap-1.5 text-left min-w-0 rounded-full pl-3 pr-2 py-1.5 shrink-0"
            style={{
              touchAction: 'manipulation',
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${colors.uiAccent}40`,
            }}>
            <h1
              className="text-[10px] font-semibold tracking-widest truncate"
              style={{ color: colors.uiAccent }}>
              {team.abbrev.toUpperCase()}
            </h1>
            <ChevronDown size={14} color="#A5ACAF" className="shrink-0" />
          </button>
          {/* Page switcher — sized to its own labels plus a little padding, not
              stretched to fill the row. */}
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5 shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            {PAGE_TABS.map((tab) => {
              const labelClass = 'px-2 py-1 rounded-md text-[9px] font-bold tracking-wide';
              const href =
                tab.key === 'roster' ? `/team/${team.id}` : `/team/${team.id}/${tab.key}`;
              if (tab.key === activePage) {
                return (
                  <span
                    key={tab.key}
                    aria-current="page"
                    className={labelClass}
                    style={{ background: colors.uiAccent, color: colors.onAccent }}>
                    {tab.label}
                  </span>
                );
              }
              return (
                <Link
                  key={tab.key}
                  href={href}
                  onClick={navigate(href)}
                  aria-disabled={isPending}
                  className={labelClass}
                  style={{
                    color: uiTokens.textMuted,
                    opacity: isPending ? 0.5 : 1,
                    touchAction: 'manipulation',
                  }}>
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} accent={colors.uiAccent} />

      <FullScreenSheet isOpen={navOpen}>
        <NavSwitcher
          team={team}
          teams={teams}
          currentTeamPlayers={currentTeamPlayers}
          onSelectPlayer={(player) => onSelectPlayer?.(player)}
          onClose={() => setNavOpen(false)}
        />
      </FullScreenSheet>
    </>
  );
}
