'use client';

// Shared team-page top bar: hamburger menu trigger, team switcher pill (abbrev +
// chevron), and the ROSTER/SCHEDULE/STATS page switcher (design spec 5a). Used by
// both the field (components/DepthChartField.tsx) and the stats page
// (components/TeamStatsView.tsx) so moving between roster/schedule/stats reads as a
// tab change, not navigating away and back. Owns its own nav-drawer/switcher sheet
// state so callers don't have to wire it up per page. All three tabs are live routes:
// ROSTER (/team/[id]), SCHEDULE (/team/[id]/schedule), STATS (/team/[id]/stats).
import SegmentedControl from '@/components/ui/SegmentedControl';
import { colors as uiTokens } from '@/components/ui/tokens';
import type { TeamMeta } from '@/lib/roster-source';
import type { Player, TeamColors } from '@/lib/types';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import DepthMark from './DepthMark';
import FullScreenSheet from './FullScreenSheet';
import NavDrawer from './NavDrawer';
import NavSwitcher from './NavSwitcher';

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
  const hrefFor = (key: PageKey) =>
    key === 'roster' ? `/team/${team.id}` : `/team/${team.id}/${key}`;
  // Let modifier/middle clicks fall through to the <Link>'s native open-in-new-tab;
  // for a plain left click, take over so the transition holds the old page mounted
  // (no loading-skeleton flash) instead of hard-navigating.
  const navigate = (key: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e as React.MouseEvent).button !== 0)
      return;
    e.preventDefault();
    if (isPending) return;
    startTransition(() => router.push(hrefFor(key as PageKey)));
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
              background: uiTokens.surfaceChip,
              border: `1px solid ${colors.uiAccent}40`,
            }}>
            <h1
              className="text-[10px] font-semibold tracking-widest truncate"
              style={{ color: colors.uiAccent }}>
              {team.abbrev.toUpperCase()}
            </h1>
            <ChevronDown size={14} color={uiTokens.textMuted} className="shrink-0" />
          </button>
          {/* Page switcher — hugs its own labels, not stretched to fill the row. */}
          <SegmentedControl
            size="sm"
            className="shrink-0"
            options={PAGE_TABS.map((tab) => ({
              value: tab.key,
              label: tab.label,
              href: hrefFor(tab.key),
            }))}
            value={activePage}
            onChange={navigate}
            activeColor={colors.uiAccent}
            activeTextColor={colors.onAccent}
            disabled={isPending}
          />
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
