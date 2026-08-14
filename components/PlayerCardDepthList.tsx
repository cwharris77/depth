'use client';

// PlayerCard's "position depth" section: the list of players at the current
// player's position, either browsable (tap to jump) or drag-reorderable. Both modes
// render the same rank/number/name row content (DepthRowContent) — only the
// wrapper (Reorder.Item vs a plain button) and the trailing check icon differ.
// Edit/hint state resets when player.id changes, adjusted during render (comparing
// against prevPlayerId) rather than in an effect — no prop-mirror effect needed.
import { statusColor } from '@/lib/utils/colors';
import { markReorderHintSeen, seenReorderHint } from '@/lib/utils/depth-chart/depth-overrides';
import type { Player, Position, TeamColors } from '@/lib/types';
import { Reorder } from 'framer-motion';
import { Check, GripVertical, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';

interface PlayerCardDepthListProps {
  player: Player;
  depthChart: Player[];
  colors: TeamColors;
  isPositionCustom: boolean;
  onResetPosition?: (position: Position) => void;
  onReorder?: (position: Position, orderedIds: string[]) => void;
  onSelectPlayer?: (player: Player) => void;
  globalEditMode: boolean;
}

// Historical depth ranks are capped at 3 by the usage heuristic (see
// lib/nflverse/depth-heuristic.ts), and current-season ESPN depth charts can run
// deeper than 3 at some positions -- rank 3+ is bucketed as "reserve" rather than
// implying a literal ordinal that isn't real.
function depthRankLabel(rank: number): string {
  if (rank === 1) return 'STARTER';
  if (rank === 2) return 'BACKUP';
  return 'RESERVE';
}

function DepthRowContent({
  p,
  isCurrent,
  accent,
  colors,
}: {
  p: Player;
  isCurrent: boolean;
  accent: string;
  colors: TeamColors;
}) {
  return (
    <>
      <div
        className="font-bold"
        style={{
          color: statusColor(p.status, colors),
          letterSpacing: '0.08em',
          minWidth: 64,
          fontSize: typeScale.caption,
        }}>
        {depthRankLabel(p.depthRank)}
      </div>
      <div className="text-xs font-bold" style={{ color: 'rgba(165,172,175,0.7)', minWidth: 28 }}>
        #{p.number}
      </div>
      <div
        className="flex-1 text-sm font-bold"
        style={{ color: isCurrent ? accent : uiTokens.textPrimary }}>
        {p.name}
      </div>
    </>
  );
}

export default function PlayerCardDepthList({
  player,
  depthChart,
  colors,
  isPositionCustom,
  onResetPosition,
  onReorder,
  onSelectPlayer,
  globalEditMode,
}: PlayerCardDepthListProps) {
  const accent = colors.uiAccent;
  const [editing, setEditing] = useState(false);
  const [showHint, setShowHint] = useState(() => !seenReorderHint());
  const [prevPlayerId, setPrevPlayerId] = useState(player.id);
  if (player.id !== prevPlayerId) {
    setPrevPlayerId(player.id);
    setEditing(false);
    setShowHint(!seenReorderHint());
  }
  // The global toggle wins over local state — the list is in reorder mode if either
  // is on. Turning the global toggle off drops back to local `editing` (false unless
  // the per-card toggle was independently used before the global one turned on).
  const effectiveEditing = editing || globalEditMode;

  const toggleEditing = () => {
    markReorderHintSeen();
    setShowHint(false);
    setEditing((e) => !e);
  };

  if (depthChart.length <= 1) {
    return (
      <div className="px-6 mb-6">
        <div
          className="font-semibold mb-3"
          style={{
            color: uiTokens.textMuted,
            letterSpacing: '0.1em',
            fontSize: typeScale.caption,
          }}>
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
    );
  }

  return (
    <div className="px-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPositionCustom && (
            <Badge variant="tag" accent={accent}>
              CUSTOM
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPositionCustom && onResetPosition && (
            <button
              type="button"
              onClick={() => onResetPosition(player.position)}
              className="flex items-center gap-1 font-bold"
              style={{
                color: uiTokens.textMuted,
                touchAction: 'manipulation',
                fontSize: typeScale.caption,
              }}>
              <RotateCcw size={12} /> Reset
            </button>
          )}
          {/* Hidden while the app-level toggle is on — that toggle is the only way
              in or out of edit mode for every group at once; a per-card button here
              would either be redundant (already editing) or misleadingly imply this
              one card can opt out on its own. */}
          {onReorder && !globalEditMode && (
            <button
              type="button"
              onClick={toggleEditing}
              className="flex items-center gap-1 font-bold px-2 py-1 rounded-full"
              style={{
                color: editing ? colors.onAccent : accent,
                background: editing ? accent : `${accent}1a`,
                border: `1px solid ${accent}55`,
                fontSize: typeScale.caption,
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

      {showHint && !effectiveEditing && onReorder && (
        <div className="mb-2" style={{ color: accent, fontSize: typeScale.label }}>
          Tip: tap Reorder to build your own depth chart — your order is saved on this device.
        </div>
      )}

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: uiTokens.surfaceCard2,
          border: `1px solid ${uiTokens.borderDefault}`,
        }}>
        {effectiveEditing && onReorder ? (
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
                <DepthRowContent
                  p={p}
                  isCurrent={p.id === player.id}
                  accent={accent}
                  colors={colors}
                />
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
                <DepthRowContent p={p} isCurrent={isCurrent} accent={accent} colors={colors} />
                {isCurrent && <Check size={14} color={accent} strokeWidth={3} />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
