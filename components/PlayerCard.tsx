'use client';

// PlayerCard shows one player's bio/stats/position-depth, as a mobile bottom sheet
// (default) or docked inline beside the field (TeamPageShell's desktop context
// panel). It composes its sections rather than owning them: PlayerCardHeader and
// PlayerCardDepthList each reset their own share/edit state internally when
// player.id changes (render-time comparison, not a key remount -- key-based
// remounting of these two produced a duplicate-mount rendering bug here); stats
// loading lives in usePlayerCardStats, and the sheet's focus trap lives in
// useFocusTrap.
import { experienceLabel } from '@/lib/utils/format';
import { getPlayersByPosition } from '@/lib/utils/roster/roster';
import { hasSeasonStats, seasonStatColumns } from '@/lib/utils/stat-table';
import type { Player, PlayerSeasonStats, Position, TeamRoster } from '@/lib/types';
import { usePlayerCardStats } from '@/lib/hooks/player-card/use-player-card-stats';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import PlayerCardHeader from '@/components/PlayerCardHeader';
import PlayerCardDepthList from '@/components/PlayerCardDepthList';
import PlayerCardSeasonStats from '@/components/PlayerCardSeasonStats';
import StatGrid from '@/components/ui/StatGrid';
import { colors as uiTokens, typeScale, zIndex } from '@/components/ui/tokens';

// DEP-201: the shared springSheet token (stiffness 360, damping 38 — components/ui/tokens.ts)
// is also used by BottomSheet, UniformSheet, FullScreenSheet, and IOSInstallHint. Lowering it
// there would soften all of those too, which wasn't the ask and wasn't verified for them, so
// PlayerCard's rise gets its own, gentler spring instead of mutating the shared token. Lower
// stiffness/damping (vs. springSheet's near-critical ~1.0 ratio) makes the sheet read as sliding
// up rather than snapping into place, while staying non-oscillatory.
const springPlayerCard = { type: 'spring', stiffness: 220, damping: 28 } as const;

interface PlayerCardProps {
  player: Player | null;
  roster: TeamRoster;
  onClose: () => void;
  onSelectPlayer?: (player: Player) => void;
  // Custom depth reordering (roadmap C). When onReorder is provided, the position-depth
  // list gets a Reorder toggle that drag-sorts the players and reports the new id order.
  onReorder?: (position: Position, orderedIds: string[]) => void;
  onResetPosition?: (position: Position) => void;
  isPositionCustom?: boolean;
  // App-level "edit depth chart" toggle (DepthChartField). When true, the depth list
  // is in reorder mode without needing its own per-card Reorder tap, and the
  // per-card toggle button is hidden — the app-level toggle is the only way in or
  // out while it's on.
  globalEditMode?: boolean;
  // Prefetched season stats keyed by player id (server-side, from the team page).
  // When provided, the card skips the client-side fetch entirely — no loading state,
  // no jump. When absent (legacy callers), falls back to the client-side fetch.
  playerStatsMap?: Map<string, PlayerSeasonStats[]>;
  // 'sheet' (default) is the mobile bottom sheet; 'docked' renders the same card body
  // inline for TeamPageShell's desktop context panel — no scrim, drag handle, or
  // slide-up, and no body scroll lock (the field stays interactive beside it).
  variant?: 'sheet' | 'docked';
}

export default function PlayerCard({
  player,
  roster,
  onClose,
  onSelectPlayer,
  onReorder,
  onResetPosition,
  isPositionCustom = false,
  globalEditMode = false,
  playerStatsMap,
  variant = 'sheet',
}: PlayerCardProps) {
  // uiAccent is curated to read on the dark card; the alpha suffixes tint it for
  // borders/watermarks. onAccent isn't needed here (card surfaces are dark).
  const colors = roster.team.colors;
  const accent = colors.uiAccent;
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const { seasonStats, statsLoading } = usePlayerCardStats(player, playerStatsMap);

  // The card's content scrolls internally (overflow-y-auto below), so drag can
  // only be initiated from the pull-handle — dragging anywhere else would fight
  // vertical scroll/taps. dragControls + dragListener=false scopes it there.
  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  // Docked cards sit beside the field, not over it — never lock body scroll. Genuine escape
  // hatch: toggling a class on `document.body` mutates a DOM node outside this component's own
  // render output, with no derived-render equivalent.
  useEffect(() => {
    if (variant === 'docked') return;
    if (player) {
      document.body.classList.add('card-open');
    } else {
      document.body.classList.remove('card-open');
    }
    return () => document.body.classList.remove('card-open');
  }, [player?.id, variant]);

  useFocusTrap(panelRef, variant !== 'docked' && !!player, player?.id, onClose);

  const depthChart = player ? getPlayersByPosition(roster, player.position) : [];
  // The SEASON STATS table: the position's columns (header + accessors) and the seasons
  // the player actually played (hasSeasonStats drops no-games rows — show nothing, not
  // zeros). Newest-first ordering comes from the API (getPlayerStats orders season desc).
  const statColumns = player ? seasonStatColumns(player.position) : [];
  const statSeasons = player ? seasonStats.filter(hasSeasonStats) : [];
  // True while the client-side fetch is in flight (only when playerStatsMap is absent).
  // During loading, a skeleton placeholder reserves the stats section's height so the
  // bottom sheet doesn't jump when stats arrive.
  const showStatsSkeleton = statsLoading && player && statColumns.length > 0;

  // The card body — identical between the mobile bottom sheet and the desktop docked
  // panel (TeamPageShell's aside); only the chrome around it differs (scrim + spring
  // sheet on mobile, a plain fill-height scroll region when docked). Header and
  // DepthList each reset their own share/edit state internally on player switch.
  const content = player && (
    <>
      <PlayerCardHeader player={player} teamId={roster.team.id} colors={colors} onClose={onClose} />

      <div className="mx-6 my-4">
        <StatGrid
          stats={[
            { label: 'AGE', value: player.age || '—' },
            { label: 'EXP', value: experienceLabel(player.experience) },
            { label: 'HT', value: player.height || '—' },
            { label: 'WT', value: player.weight || '—' },
          ]}
        />
      </div>

      <div className="px-6 mb-3 flex items-center gap-1.5">
        <GraduationCap size={14} style={{ color: accent, opacity: 0.85 }} />
        <span className="text-sm font-bold" style={{ color: uiTokens.textPrimary }}>
          {player.college}
        </span>
      </div>

      {player.bio && (
        <div className="px-6 mb-4">
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,244,255,0.75)' }}>
            {player.bio}
          </p>
        </div>
      )}

      {player.stats && Object.keys(player.stats).length > 0 && (
        <div className="px-6 mb-6">
          <div
            className="font-semibold mb-3"
            style={{
              color: uiTokens.textMuted,
              letterSpacing: '0.1em',
              fontSize: typeScale.caption,
            }}>
            2024 SEASON
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(player.stats).map(([key, val]) => (
              <div
                key={key}
                className="flex flex-col items-center rounded-xl px-4 py-2"
                style={{
                  background: 'rgba(0,34,68,0.5)',
                  border: `1px solid ${accent}33`,
                  minWidth: 64,
                }}>
                <div className="text-xl font-black" style={{ color: accent }}>
                  {val}
                </div>
                <div
                  className="font-semibold mt-0.5"
                  style={{
                    color: uiTokens.textMuted,
                    letterSpacing: '0.06em',
                    fontSize: typeScale.micro,
                  }}>
                  {key.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PlayerCardDepthList
        player={player}
        depthChart={depthChart}
        colors={colors}
        isPositionCustom={isPositionCustom}
        onResetPosition={onResetPosition}
        onReorder={onReorder}
        onSelectPlayer={onSelectPlayer}
        globalEditMode={globalEditMode}
      />

      <PlayerCardSeasonStats
        statColumns={statColumns}
        statSeasons={statSeasons}
        showSkeleton={!!showStatsSkeleton}
        accent={accent}
      />
    </>
  );

  if (variant === 'docked') {
    return player ? <div className="h-full overflow-y-auto">{content}</div> : null;
  }

  return (
    <AnimatePresence>
      {player && (
        <>
          <motion.div
            className="absolute inset-0"
            style={{
              background: uiTokens.scrim,
              backdropFilter: 'blur(4px)',
              zIndex: zIndex.overlayBackdrop,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${player.name} player card`}
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
            style={{
              background: uiTokens.panelGradient,
              borderTop: `1px solid ${accent}4d`,
              maxHeight: '82vh',
              zIndex: zIndex.overlayPanel,
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springPlayerCard}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}>
            <div
              className="flex justify-center pt-3 pb-1"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => dragControls.start(e)}>
              <div
                className="rounded-full"
                style={{
                  width: 36,
                  height: 4,
                  background: uiTokens.borderInput,
                }}
              />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(82vh - 32px)' }}>
              {content}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
