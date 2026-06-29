"use client";

import { useState } from "react";
import type { Player, Unit } from "@/lib/types";
import { getActiveTeam } from "@/lib/teams";
import { resolveUnit } from "@/lib/formations";
import PlayerDot from "./PlayerDot";
import PlayerCard from "./PlayerCard";

const UNIT_LABELS: Record<Unit, string> = {
  offense: "Offense",
  defense: "Defense",
  special: "Special",
};

export default function DepthChartField() {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>("offense");

  const roster = getActiveTeam();
  const { team } = roster;
  const slots = resolveUnit(roster, activeUnit);

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer((prev) => (prev?.id === player.id ? null : player));
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
