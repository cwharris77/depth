'use client';

// Desktop multi-panel frame for the three team pages (Wide-screen responsive multi-panel
// ticket; layout from the Claude Design "Depth Wide Desktop" mock). At the `xl`
// breakpoint the page becomes a viewport-height three-column grid — team rail · main
// content · context panel — instead of a stretched mobile column; below it, children
// render exactly as before (rail and panel are CSS-hidden, so the prerendered HTML is
// correct at every width with no JS layout switch — the SSR concern the ticket called
// out). The panel's content is page-specific and passed in by each view: the docked
// player card (roster), the season snapshot (schedule), the PF/PA trend (stats). The
// shell owns only the frame.
import { colors as uiTokens } from '@/components/ui/tokens';
import type { TeamMeta } from '@/lib/roster-source';
import type { ReactNode } from 'react';
import TeamRail, { type TeamPageKey } from './TeamRail';

export default function TeamPageShell({
  team,
  teams,
  activePage,
  accent,
  aside,
  children,
}: {
  team: TeamMeta;
  teams: TeamMeta[];
  activePage: TeamPageKey;
  accent: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full xl:mx-auto xl:grid xl:h-dvh xl:max-w-[1600px] xl:grid-cols-[232px_minmax(0,1fr)_348px] xl:overflow-hidden">
      <TeamRail team={team} teams={teams} activePage={activePage} accent={accent} />
      {/* min-w-0 lets the main column shrink inside the grid; on mobile it's a plain
          block wrapper and the children own their own layout. */}
      <main className="min-w-0 xl:min-h-0 xl:overflow-y-auto">{children}</main>
      <aside
        className="hidden xl:block xl:min-h-0 xl:overflow-y-auto"
        style={{
          borderLeft: `1px solid ${uiTokens.borderDefault}`,
          // Same panel gradient the mobile sheets use (PlayerCard, FullScreenSheet), so
          // docked content reads as the same surface it slides up as on mobile.
          background: `linear-gradient(180deg, #0f1a2e 0%, ${uiTokens.bg} 100%)`,
        }}>
        {aside}
      </aside>
    </div>
  );
}
