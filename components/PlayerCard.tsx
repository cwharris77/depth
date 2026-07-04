"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, Reorder, useDragControls, type PanInfo } from "framer-motion";
import Image from "next/image";
import { X, Check, GripVertical, RotateCcw } from "lucide-react";
import type { Player, Position, TeamColors, TeamRoster } from "@/lib/types";
import { getPlayersByPosition } from "@/lib/roster";
import { markReorderHintSeen, seenReorderHint } from "@/lib/depth-overrides";
import { statusColor, readableTextOn } from "@/lib/colors";

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
}

const statusLabel: Record<string, string> = {
  starter: "STARTER",
  backup: "BACKUP",
  rookie: "ROOKIE",
  injured: "INJURED",
};

const depthRankLabel: Record<number, string> = {
  1: "STARTER",
  2: "BACKUP",
  3: "3RD STRING",
};

// Real ESPN headshot when available; falls back to a generic player silhouette
// (Madden-style default card art) via onError, since a stale/missing ESPN id
// 404s rather than failing to resolve. Keyed by player.id in the parent so the
// fallback state resets when a different player is selected. next/image
// (remote pattern configured in next.config.ts) fetches each headshot once and
// serves a cached/resized copy from Vercel's edge afterward, instead of
// hitting ESPN's CDN on every card open.
function PlayerAvatar({ player, colors }: { player: Player; colors: TeamColors }) {
  const [errored, setErrored] = useState(false);
  const showPhoto = Boolean(player.photoUrl) && !errored;

  return (
    <div
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
      style={{
        width: 72,
        height: 72,
        border: `2px solid ${colors.secondary}`,
        background: colors.primary,
        color: readableTextOn(colors.primary),
      }}
    >
      {showPhoto ? (
        <Image
          src={player.photoUrl!}
          alt={player.name}
          width={72}
          height={72}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          style={{ width: "60%", height: "60%", opacity: 0.7 }}
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4z" />
        </svg>
      )}
    </div>
  );
}

export default function PlayerCard({
  player,
  roster,
  onClose,
  onSelectPlayer,
  onReorder,
  onResetPosition,
  isPositionCustom = false,
}: PlayerCardProps) {
  const [editing, setEditing] = useState(false);
  const [showHint, setShowHint] = useState(false);
  // uiAccent is curated to read on the dark card; the alpha suffixes tint it for
  // borders/watermarks. onAccent isn't needed here (card surfaces are dark).
  const colors = roster.team.colors;
  const accent = colors.uiAccent;
  const dragControls = useDragControls();

  // The card's content scrolls internally (overflow-y-auto below), so drag can
  // only be initiated from the pull-handle — dragging anywhere else would fight
  // vertical scroll/taps. dragControls + dragListener=false scopes it there.
  const handleDragEnd = (
    _event: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  useEffect(() => {
    if (player) {
      document.body.classList.add("card-open");
      // Fresh card: leave edit mode, and surface the one-time reorder hint.
      setEditing(false);
      setShowHint(!seenReorderHint());
    } else {
      document.body.classList.remove("card-open");
    }
    return () => document.body.classList.remove("card-open");
  }, [player]);

  const toggleEditing = () => {
    markReorderHintSeen();
    setShowHint(false);
    setEditing((e) => !e);
  };

  const depthChart = player ? getPlayersByPosition(roster, player.position) : [];

  return (
    <AnimatePresence>
      {player && (
        <>
          <motion.div
            className="absolute inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #0f1a2e 0%, #0a0e1a 100%)",
              borderTop: `1px solid ${accent}4d`,
              maxHeight: "82vh",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 38 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            <div
              className="flex justify-center pt-3 pb-1"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div
                className="rounded-full"
                style={{
                  width: 36,
                  height: 4,
                  background: "rgba(255,255,255,0.2)",
                }}
              />
            </div>

            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(82vh - 32px)" }}
            >
              <div className="flex items-start justify-between px-6 pt-4 pb-2">
                <div className="flex items-start gap-4">
                  <PlayerAvatar key={player.id} player={player} colors={colors} />
                  <div>
                    <div
                      className="text-6xl font-black leading-none"
                      style={{
                        color: `${accent}26`,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      #{player.number}
                    </div>
                    <div
                      className="text-2xl font-black leading-tight -mt-4"
                      style={{
                        color: "#f0f4ff",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {player.name}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(0,34,68,0.8)",
                          color: accent,
                          border: `1px solid ${accent}66`,
                        }}
                      >
                        {player.position}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: statusColor(player.status, colors) }}
                      >
                        {statusLabel[player.status]}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close player card"
                  className="rounded-full p-2 mt-1"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    touchAction: "manipulation",
                  }}
                >
                  <X size={18} color="#A5ACAF" />
                </button>
              </div>

              <div
                className="mx-6 my-4 rounded-2xl grid grid-cols-4 divide-x"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {[
                  { label: "AGE", value: player.age },
                  { label: "EXP", value: `${player.experience}Y` },
                  { label: "HT", value: player.height },
                  { label: "WT", value: `${player.weight}` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center py-3"
                  >
                    <div
                      className="text-[10px] font-semibold"
                      style={{ color: "#A5ACAF", letterSpacing: "0.08em" }}
                    >
                      {stat.label}
                    </div>
                    <div
                      className="text-base font-black mt-0.5"
                      style={{ color: "#f0f4ff" }}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 mb-3">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#A5ACAF", letterSpacing: "0.06em" }}
                >
                  COLLEGE
                </span>
                <span
                  className="ml-2 text-sm font-bold"
                  style={{ color: "#f0f4ff" }}
                >
                  {player.college}
                </span>
              </div>

              <div className="px-6 mb-4">
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(240,244,255,0.75)" }}
                >
                  {player.bio}
                </p>
              </div>

              {player.stats && Object.keys(player.stats).length > 0 && (
                <div className="px-6 mb-6">
                  <div
                    className="text-[10px] font-semibold mb-3"
                    style={{ color: "#A5ACAF", letterSpacing: "0.1em" }}
                  >
                    2024 SEASON
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(player.stats).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex flex-col items-center rounded-xl px-4 py-2"
                        style={{
                          background: "rgba(0,34,68,0.5)",
                          border: `1px solid ${accent}33`,
                          minWidth: 64,
                        }}
                      >
                        <div
                          className="text-xl font-black"
                          style={{ color: accent }}
                        >
                          {val}
                        </div>
                        <div
                          className="text-[9px] font-semibold mt-0.5"
                          style={{ color: "#A5ACAF", letterSpacing: "0.06em" }}
                        >
                          {key.toUpperCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {depthChart.length > 1 && (
                <div className="px-6 pb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: "#A5ACAF", letterSpacing: "0.1em" }}
                      >
                        POSITION DEPTH · {player.position}
                      </span>
                      {isPositionCustom && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            color: accent,
                            background: `${accent}1a`,
                            border: `1px solid ${accent}55`,
                          }}
                        >
                          CUSTOM
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isPositionCustom && onResetPosition && (
                        <button
                          type="button"
                          onClick={() => onResetPosition(player.position)}
                          className="flex items-center gap-1 text-[10px] font-bold"
                          style={{ color: "#A5ACAF", touchAction: "manipulation" }}
                        >
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
                            touchAction: "manipulation",
                          }}
                        >
                          {editing ? (
                            "Done"
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
                      Tip: tap Reorder to build your own depth chart — your order is saved
                      on this device.
                    </div>
                  )}

                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {editing && onReorder ? (
                      <Reorder.Group
                        axis="y"
                        values={depthChart.map((p) => p.id)}
                        onReorder={(ids) => onReorder(player.position, ids as string[])}
                        style={{ listStyle: "none", margin: 0, padding: 0 }}
                      >
                        {depthChart.map((p, i) => (
                          <Reorder.Item
                            key={p.id}
                            value={p.id}
                            className="flex items-center gap-3 px-4 py-3"
                            style={{
                              background:
                                p.id === player.id ? `${accent}1a` : "transparent",
                              borderTop:
                                i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                              cursor: "grab",
                              touchAction: "none",
                            }}
                          >
                            <GripVertical
                              size={16}
                              color="#A5ACAF"
                              style={{ flexShrink: 0 }}
                            />
                            <div
                              className="text-[10px] font-bold"
                              style={{
                                color: statusColor(p.status, colors),
                                letterSpacing: "0.08em",
                                minWidth: 64,
                              }}
                            >
                              {depthRankLabel[p.depthRank]}
                            </div>
                            <div
                              className="text-xs font-bold"
                              style={{ color: "rgba(165,172,175,0.7)", minWidth: 28 }}
                            >
                              #{p.number}
                            </div>
                            <div
                              className="flex-1 text-sm font-bold truncate"
                              style={{ color: p.id === player.id ? accent : "#f0f4ff" }}
                            >
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
                              background: isCurrent ? `${accent}1a` : "transparent",
                              borderTop:
                                i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                              touchAction: "manipulation",
                              cursor: isCurrent ? "default" : "pointer",
                            }}
                          >
                            <div
                              className="text-[10px] font-bold"
                              style={{
                                color: statusColor(p.status, colors),
                                letterSpacing: "0.08em",
                                minWidth: 64,
                              }}
                            >
                              {depthRankLabel[p.depthRank]}
                            </div>
                            <div
                              className="text-xs font-bold"
                              style={{ color: "rgba(165,172,175,0.7)", minWidth: 28 }}
                            >
                              #{p.number}
                            </div>
                            <div
                              className="flex-1 text-sm font-bold truncate"
                              style={{ color: isCurrent ? accent : "#f0f4ff" }}
                            >
                              {p.name}
                            </div>
                            {isCurrent && (
                              <Check size={14} color={accent} strokeWidth={3} />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
