"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { Player, TeamRoster, Unit } from "@/lib/types";
import { resolveUnit } from "@/lib/formations";
import { searchPlayers, unitForPosition } from "@/lib/search";
import PlayerDot from "./PlayerDot";
import PlayerCard from "./PlayerCard";

const UNIT_LABELS: Record<Unit, string> = {
  offense: "Offense",
  defense: "Defense",
  special: "Special",
};

// Pure client component: it receives one resolved roster as a prop and never
// imports the team registry, so a page ships only its own team's data — not all 32.
export default function DepthChartField({ roster }: { roster: TeamRoster }) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>("offense");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { team } = roster;
  const slots = resolveUnit(roster, activeUnit);
  const results = searchPlayers(roster, query);

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer((prev) => (prev?.id === player.id ? null : player));
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  // Selecting a search hit jumps the field to that player's unit, then opens them.
  const handleSearchSelect = (player: Player) => {
    setActiveUnit(unitForPosition(player.position));
    setSelectedPlayer(player);
    closeSearch();
  };

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: "#0a0e1a",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pb-3"
        style={{
          background: "#0a0e1a",
          flex: "0 0 auto",
          paddingTop: "max(env(safe-area-inset-top), 12px)",
        }}
      >
        <div>
          <div
            className="text-[10px] font-semibold tracking-widest"
            style={{ color: team.colors.uiAccent }}
          >
            {team.city.toUpperCase()} {team.name.toUpperCase()}
          </div>
          <h1
            className="text-xl font-black leading-tight"
            style={{ color: "#f0f4ff", letterSpacing: "-0.02em" }}
          >
            Depth Chart
          </h1>
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search players"
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 34,
            height: 34,
            background: "rgba(255,255,255,0.07)",
            color: "#A5ACAF",
            touchAction: "manipulation",
          }}
        >
          <Search size={16} />
        </button>
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          {(["offense", "defense", "special"] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => {
                setActiveUnit(unit);
                setSelectedPlayer(null);
              }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background:
                  activeUnit === unit ? team.colors.primary : "transparent",
                color:
                  activeUnit === unit ? team.colors.uiAccent : "#A5ACAF",
                border:
                  activeUnit === unit
                    ? `1px solid ${team.colors.uiAccent}66`
                    : "1px solid transparent",
                touchAction: "manipulation",
              }}
            >
              {UNIT_LABELS[unit]}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Field — fills remaining viewport space */}
      <div
        className="px-3 pb-2 flex flex-col"
        style={{ flex: "1 1 0", minHeight: 0 }}
      >
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            flex: "1 1 0",
            minHeight: 0,
            background:
              "linear-gradient(180deg, #1e3d10 0%, #2d5a1b 40%, #2d5a1b 60%, #1e3d10 100%)",
            boxShadow:
              "inset 0 0 60px rgba(0,0,0,0.4), 0 4px 32px rgba(0,0,0,0.6)",
          }}
        >
          <FieldMarkings />

          {slots.map((slot) => {
            const player = slot.player;
            if (!player) return null;
            return (
              <PlayerDot
                key={slot.key}
                player={player}
                slot={slot}
                isSelected={selectedPlayer?.id === player.id}
                onClick={handlePlayerClick}
                side={activeUnit}
                teamPrimary={team.colors.primary}
                teamColors={team.colors}
              />
            );
          })}

          <div
            className="absolute text-[9px] font-bold tracking-widest"
            style={{
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.25)",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              letterSpacing: "0.2em",
            }}
          >
            LINE OF SCRIMMAGE
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex gap-4 justify-center mt-2 flex-wrap"
          style={{ flex: "0 0 auto" }}
        >
          {[
            { label: "Starter", color: team.colors.uiAccent },
            { label: "Rookie", color: "#4fc3f7" },
            { label: "Injured", color: "#ef5350" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{ width: 7, height: 7, background: color }}
              />
              <span className="text-[10px]" style={{ color: "#A5ACAF" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSearch}
            />
            <motion.div
              className="fixed left-0 right-0 top-0 z-50 rounded-b-3xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #0f1a2e 0%, #0a0e1a 100%)",
                borderBottom: `1px solid ${team.colors.uiAccent}40`,
                paddingTop: "max(env(safe-area-inset-top), 12px)",
                maxHeight: "85dvh",
              }}
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 38 }}
            >
              <div className="flex items-center gap-2 px-4 pt-3 pb-3">
                <div
                  className="flex items-center gap-2 flex-1 rounded-xl px-3"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${team.colors.uiAccent}55`,
                  }}
                >
                  <Search size={16} color={team.colors.uiAccent} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search players"
                    className="flex-1 bg-transparent outline-none py-2.5 text-base"
                    style={{ color: "#f0f4ff" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  className="rounded-full p-2"
                  style={{ background: "rgba(255,255,255,0.08)", touchAction: "manipulation" }}
                >
                  <X size={18} color="#A5ACAF" />
                </button>
              </div>

              <div className="overflow-y-auto px-3 pb-4" style={{ maxHeight: "calc(85dvh - 64px)" }}>
                {query.trim() === "" ? (
                  <div className="px-3 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
                    Search any player by name, number, or position
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
                    No players match “{query.trim()}”
                  </div>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSearchSelect(p)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                      style={{ touchAction: "manipulation" }}
                    >
                      <div
                        className="flex items-center justify-center rounded-lg text-xs font-bold"
                        style={{
                          width: 34,
                          height: 34,
                          background: "rgba(255,255,255,0.06)",
                          color: "#f0f4ff",
                        }}
                      >
                        {p.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: "#f0f4ff" }}>
                          {p.name}
                        </div>
                        <div className="text-[11px]" style={{ color: "#A5ACAF" }}>
                          {p.position} · {UNIT_LABELS[unitForPosition(p.position)]}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PlayerCard
        player={selectedPlayer}
        roster={roster}
        onClose={() => setSelectedPlayer(null)}
        onSelectPlayer={setSelectedPlayer}
      />
    </div>
  );
}

function FieldMarkings() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* yard lines spaced every 10% */}
      {[10, 20, 30, 40, 60, 70, 80, 90].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.4"
        />
      ))}
      {/* end zones */}
      <rect x="0" y="0" width="100" height="6" fill="rgba(0,34,68,0.3)" />
      <rect x="0" y="94" width="100" height="6" fill="rgba(0,34,68,0.3)" />
      {/* line of scrimmage */}
      <line
        x1="0"
        y1="50"
        x2="100"
        y2="50"
        stroke="rgba(255,255,255,0.30)"
        strokeWidth="0.6"
        strokeDasharray="1.6,1.6"
      />
      {/* hash marks */}
      {[15, 25, 35, 45, 55, 65, 75, 85].map((y) => (
        <g key={`hash-${y}`}>
          <line
            x1="32"
            y1={y}
            x2="35"
            y2={y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.4"
          />
          <line
            x1="65"
            y1={y}
            x2="68"
            y2={y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.4"
          />
        </g>
      ))}
    </svg>
  );
}
