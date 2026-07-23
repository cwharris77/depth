'use client';

import { readableTextOn, statusColor } from '@/lib/colors';
import { markReorderHintSeen, seenReorderHint } from '@/lib/depth-overrides';
import { experienceLabel } from '@/lib/format';
import { positionFullName } from '@/lib/positions';
import { getPlayersByPosition } from '@/lib/roster';
import { playerDeepLinkPath } from '@/lib/share';
import { hasSeasonStats, seasonStatColumns } from '@/lib/stat-table';
import type { Player, PlayerSeasonStats, Position, TeamRoster } from '@/lib/types';
import { AnimatePresence, motion, Reorder, useDragControls, type PanInfo } from 'framer-motion';
import { Check, GraduationCap, GripVertical, RotateCcw, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import StatGrid from '@/components/ui/StatGrid';
import IconButton from '@/components/ui/IconButton';
import { colors as uiTokens } from '@/components/ui/tokens';

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
  // Prefetched season stats keyed by player id (server-side, from the team page).
  // When provided, the card skips the client-side fetch entirely — no loading state,
  // no jump. When absent (legacy callers), falls back to the client-side fetch.
  playerStatsMap?: Map<string, PlayerSeasonStats[]>;
  // 'sheet' (default) is the mobile bottom sheet; 'docked' renders the same card body
  // inline for TeamPageShell's desktop context panel — no scrim, drag handle, or
  // slide-up, and no body scroll lock (the field stays interactive beside it).
  variant?: 'sheet' | 'docked';
}

const depthRankLabel: Record<number, string> = {
  1: 'STARTER',
  2: 'BACKUP',
  3: '3RD STRING',
};

export default function PlayerCard({
  player,
  roster,
  onClose,
  onSelectPlayer,
  onReorder,
  onResetPosition,
  isPositionCustom = false,
  playerStatsMap,
  variant = 'sheet',
}: PlayerCardProps) {
  const [editing, setEditing] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [copied, setCopied] = useState(false);
  // When playerStatsMap is provided (server-side prefetch), stats are available
  // synchronously — no loading state, no jump. Fall back to client-side fetch for
  // legacy callers that don't pass the map.
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats[]>(() => {
    if (playerStatsMap && player) {
      return playerStatsMap.get(player.id) ?? [];
    }
    return [];
  });
  const [statsLoading, setStatsLoading] = useState(!playerStatsMap);
  // uiAccent is curated to read on the dark card; the alpha suffixes tint it for
  // borders/watermarks. onAccent isn't needed here (card surfaces are dark).
  const colors = roster.team.colors;
  const accent = colors.uiAccent;
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  // The card's content scrolls internally (overflow-y-auto below), so drag can
  // only be initiated from the pull-handle — dragging anywhere else would fight
  // vertical scroll/taps. dragControls + dragListener=false scopes it there.
  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  useEffect(() => {
    if (player) {
      // Docked cards sit beside the field, not over it — never lock body scroll.
      if (variant !== 'docked') document.body.classList.add('card-open');
      // Fresh card: leave edit mode, reset the copied badge, and surface the
      // one-time reorder hint. Keyed on player.id (not the player object) so
      // reordering — which re-applies the override and gives `player` a new
      // object identity for the same person — doesn't kick us out of edit mode.
      // Edit mode should only end when the user taps Done or a different
      // player is selected.
      setEditing(false);
      setCopied(false);
      setShowHint(!seenReorderHint());
    } else {
      document.body.classList.remove('card-open');
    }
    return () => document.body.classList.remove('card-open');
  }, [player?.id]);

  // Dialog semantics for the mobile sheet (docked variant sits beside the field, not over
  // it, so it isn't a modal). Mirrors NavDrawer's focus trap: capture the trigger for
  // restore, focus the first focusable element in the panel, and wrap Tab/Shift+Tab
  // between the first/last focusables while Escape closes.
  useEffect(() => {
    if (variant === 'docked' || !player) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel
      ? Array.from(
          panel.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])')
        )
      : [];
    focusables[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreFocus.current?.focus();
    };
  }, [player?.id, variant, onClose]);

  // Lazy per-player fetch (locked decision: the field view never needs stats, so this
  // isn't part of the roster payload). Only fires when playerStatsMap is NOT provided
  // (server-side prefetch). Aborted on close/player-change so a slow response for a
  // since-dismissed card can't clobber the next card's stats. Loading renders a
  // skeleton; error renders the empty state -- setSeasonStats([]) is also the reset
  // when a new player opens, so a stale season line never flashes before the fresh
  // fetch lands.
  useEffect(() => {
    if (playerStatsMap) {
      // Server-side prefetch available: use it synchronously, no fetch needed.
      setSeasonStats(player ? (playerStatsMap.get(player.id) ?? []) : []);
      setStatsLoading(false);
      return;
    }
    setSeasonStats([]);
    setStatsLoading(true);
    if (!player) return;
    const controller = new AbortController();
    fetch(`/api/players/${player.id}/stats`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { stats: [] }))
      .then((data: { stats: PlayerSeasonStats[] }) => {
        setSeasonStats(data.stats);
        setStatsLoading(false);
      })
      .catch(() => {
        // aborted, or the fetch failed -- render nothing (no error state)
        setStatsLoading(false);
      });
    return () => controller.abort();
  }, [player?.id, playerStatsMap]);

  // Share the player's deep link. Prefers the native share sheet (mobile/PWA);
  // otherwise copies the absolute URL and flips the button to a "copied" state.
  const handleShare = async () => {
    if (!player) return;
    const url = window.location.origin + playerDeepLinkPath(roster.team.id, player.id);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${player.name} · Depth`, url });
      } catch {
        // user dismissed the share sheet, or it's unavailable — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permission) — no-op
    }
  };

  const toggleEditing = () => {
    markReorderHintSeen();
    setShowHint(false);
    setEditing((e) => !e);
  };

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
  // sheet on mobile, a plain fill-height scroll region when docked).
  const content = player && (
    <>
      <div className="flex items-start justify-between px-6 pt-4 pb-2">
        <div className="flex items-start gap-4 min-w-0">
          <Avatar
            key={player.id}
            photoUrl={player.photoUrl}
            name={player.name}
            size={72}
            ringColor={accent}
            fillColor={colors.primary}
            iconColor={readableTextOn(colors.primary)}
          />
          <div className="min-w-0">
            <div
              className="text-6xl font-black leading-none"
              style={{
                color: `${accent}26`,
                letterSpacing: '-0.03em',
              }}>
              #{player.number}
            </div>
            <div
              className="text-2xl font-black leading-tight -mt-4"
              style={{
                color: uiTokens.textPrimary,
                letterSpacing: '-0.01em',
              }}>
              {player.name}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge kind="position" accent={accent}>
                {player.position}
              </Badge>
              <span
                className="text-xs font-medium min-w-0 truncate"
                style={{ color: uiTokens.textMuted }}>
                {positionFullName(player.position)}
              </span>
              <Badge kind="status" status={player.status} accent={accent} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1 shrink-0">
          <IconButton
            variant="plain"
            active={copied}
            accent={accent}
            onClick={handleShare}
            ariaLabel={copied ? 'Link copied' : 'Share player'}
            icon={
              copied ? (
                <Check size={18} color={accent} strokeWidth={3} />
              ) : (
                <Share2 size={18} color={uiTokens.textMuted} />
              )
            }
          />
          <IconButton
            variant="plain"
            onClick={onClose}
            ariaLabel="Close player card"
            icon={<X size={18} color={uiTokens.textMuted} />}
          />
        </div>
      </div>

      <div className="mx-6 my-4">
        <StatGrid
          stats={[
            { label: 'AGE', value: player.age },
            { label: 'EXP', value: experienceLabel(player.experience) },
            { label: 'HT', value: player.height },
            { label: 'WT', value: `${player.weight}` },
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
            className="text-[10px] font-semibold mb-3"
            style={{ color: uiTokens.textMuted, letterSpacing: '0.1em' }}>
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
                  className="text-[9px] font-semibold mt-0.5"
                  style={{ color: uiTokens.textMuted, letterSpacing: '0.06em' }}>
                  {key.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {depthChart.length > 1 ? (
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Do not show position depth for now. When we design for custom rosters and positions we can add it back in */}
              {/* <span
                        className="text-[10px] font-semibold"
                        style={{ color: uiTokens.textMuted, letterSpacing: '0.1em' }}>
                        POSITION DEPTH · {player.position}
                      </span> */}
              {isPositionCustom && (
                <Badge kind="tag" accent={accent}>
                  CUSTOM
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isPositionCustom && onResetPosition && (
                <button
                  type="button"
                  onClick={() => onResetPosition(player.position)}
                  className="flex items-center gap-1 text-[10px] font-bold"
                  style={{ color: uiTokens.textMuted, touchAction: 'manipulation' }}>
                  <RotateCcw size={12} /> Reset
                </button>
              )}
              {onReorder && (
                <button
                  type="button"
                  onClick={toggleEditing}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{
                    color: editing ? colors.onAccent : accent,
                    background: editing ? accent : `${accent}1a`,
                    border: `1px solid ${accent}55`,
                    touchAction: 'manipulation',
                  }}>
                  {editing ? (
                    'Done'
                  ) : (
                    <>
                      <GripVertical size={12} /> Reorder
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {showHint && !editing && onReorder && (
            <div className="mb-2 text-[11px]" style={{ color: accent }}>
              Tip: tap Reorder to build your own depth chart — your order is saved on this device.
            </div>
          )}

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: uiTokens.surfaceCard2,
              border: `1px solid ${uiTokens.borderDefault}`,
            }}>
            {editing && onReorder ? (
              <Reorder.Group
                axis="y"
                values={depthChart.map((p) => p.id)}
                onReorder={(ids) => onReorder(player.position, ids as string[])}
                style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {depthChart.map((p, i) => (
                  <Reorder.Item
                    key={p.id}
                    value={p.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background: p.id === player.id ? `${accent}1a` : 'transparent',
                      borderTop: i === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}`,
                      cursor: 'grab',
                      touchAction: 'none',
                    }}>
                    <GripVertical size={16} color={uiTokens.textMuted} style={{ flexShrink: 0 }} />
                    <div
                      className="text-[10px] font-bold"
                      style={{
                        color: statusColor(p.status, colors),
                        letterSpacing: '0.08em',
                        minWidth: 64,
                      }}>
                      {depthRankLabel[p.depthRank]}
                    </div>
                    <div
                      className="text-xs font-bold"
                      style={{ color: 'rgba(165,172,175,0.7)', minWidth: 28 }}>
                      #{p.number}
                    </div>
                    <div
                      className="flex-1 text-sm font-bold truncate"
                      style={{ color: p.id === player.id ? accent : uiTokens.textPrimary }}>
                      {p.name}
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              depthChart.map((p, i) => {
                const isCurrent = p.id === player.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !isCurrent && onSelectPlayer?.(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{
                      background: isCurrent ? `${accent}1a` : 'transparent',
                      borderTop: i === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}`,
                      touchAction: 'manipulation',
                      cursor: isCurrent ? 'default' : 'pointer',
                    }}>
                    <div
                      className="text-[10px] font-bold"
                      style={{
                        color: statusColor(p.status, colors),
                        letterSpacing: '0.08em',
                        minWidth: 64,
                      }}>
                      {depthRankLabel[p.depthRank]}
                    </div>
                    <div
                      className="text-xs font-bold"
                      style={{ color: 'rgba(165,172,175,0.7)', minWidth: 28 }}>
                      #{p.number}
                    </div>
                    <div
                      className="flex-1 text-sm font-bold truncate"
                      style={{ color: isCurrent ? accent : uiTokens.textPrimary }}>
                      {p.name}
                    </div>
                    {isCurrent && <Check size={14} color={accent} strokeWidth={3} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 mb-6">
          <div
            className="text-[10px] font-semibold mb-3"
            style={{ color: uiTokens.textMuted, letterSpacing: '0.1em' }}>
            POSITION DEPTH · {player.position}
          </div>
          <div
            className="rounded-2xl flex items-center justify-center py-6"
            style={{
              background: uiTokens.surfaceCard2,
              border: `1px solid ${uiTokens.borderDefault}`,
            }}>
            <span className="text-xs font-medium" style={{ color: uiTokens.textFaint }}>
              No backups available
            </span>
          </div>
        </div>
      )}

      {statSeasons.length > 0 || showStatsSkeleton ? (
        <div className="px-6 pb-8">
          <div
            className="text-[10px] font-semibold mb-3"
            style={{ color: uiTokens.textMuted, letterSpacing: '0.1em' }}>
            SEASON STATS
          </div>
          {/* A columnar table (SZN + the position's stat columns), not one inline
                      line per season (design spec 5a). Column set is position-specific
                      (lib/stat-table.ts); the grid template stretches to however many the
                      position has. */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: uiTokens.surfaceCard2,
              border: `1px solid ${uiTokens.borderDefault}`,
            }}>
            <div
              className="grid gap-x-2 px-2.5 py-2"
              style={{
                gridTemplateColumns: `minmax(40px, 0.7fr) repeat(${statColumns.length}, 1fr)`,
                borderBottom: `1px solid ${uiTokens.borderDefault}`,
              }}>
              <div
                className="text-[8.5px] font-bold"
                style={{ color: uiTokens.textFaint, letterSpacing: '0.04em' }}>
                SZN
              </div>
              {statColumns.map((col) => (
                <div
                  key={col.header}
                  className="text-[8.5px] font-bold"
                  style={{ color: uiTokens.textFaint, letterSpacing: '0.04em' }}>
                  {col.header}
                </div>
              ))}
            </div>
            {showStatsSkeleton ? (
              // Skeleton rows reserving space while stats load. Sized against statColumns
              // so the grid dimensions match the real table — no layout shift when data arrives.
              // Two skeleton rows (the typical number of seasons a player has stats for).
              <>
                {[0, 1].map((row) => (
                  <div
                    key={row}
                    className="grid gap-x-2 px-2.5 py-[9px]"
                    style={{
                      gridTemplateColumns: `minmax(40px, 0.7fr) repeat(${statColumns.length}, 1fr)`,
                      borderTop: row === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}`,
                    }}>
                    <div
                      className="h-3 rounded animate-pulse"
                      style={{ background: `${accent}26` }}
                    />
                    {statColumns.map((col) => (
                      <div
                        key={col.header}
                        className="h-3 rounded animate-pulse"
                        style={{ background: `${accent}1a` }}
                      />
                    ))}
                  </div>
                ))}
              </>
            ) : (
              statSeasons.map((s, i) => (
                <div
                  key={s.season}
                  className="grid gap-x-2 px-2.5 py-[9px] text-[11px] font-bold"
                  style={{
                    gridTemplateColumns: `minmax(40px, 0.7fr) repeat(${statColumns.length}, 1fr)`,
                    borderTop: i === 0 ? 'none' : `1px solid ${uiTokens.surfaceRaised}`,
                    background: i === 0 ? `${accent}0d` : 'transparent',
                  }}>
                  <div style={{ color: i === 0 ? accent : uiTokens.textPrimary }}>{s.season}</div>
                  {statColumns.map((col) => (
                    <div
                      key={col.header}
                      style={{
                        color: col.danger?.(s) ? uiTokens.statusInjured : uiTokens.textPrimary,
                      }}>
                      {col.value(s)}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-8">
          <div
            className="text-[10px] font-semibold mb-3"
            style={{ color: uiTokens.textMuted, letterSpacing: '0.1em' }}>
            SEASON STATS
          </div>
          <div
            className="rounded-2xl flex items-center justify-center py-6"
            style={{
              background: uiTokens.surfaceCard2,
              border: `1px solid ${uiTokens.borderDefault}`,
            }}>
            <span className="text-xs font-medium" style={{ color: uiTokens.textFaint }}>
              No stats available
            </span>
          </div>
        </div>
      )}
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
            className="absolute inset-0 z-40"
            style={{
              background: uiTokens.scrim,
              backdropFilter: 'blur(4px)',
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
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: `linear-gradient(180deg, #0f1a2e 0%, ${uiTokens.bg} 100%)`,
              borderTop: `1px solid ${accent}4d`,
              maxHeight: '82vh',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 38 }}
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
