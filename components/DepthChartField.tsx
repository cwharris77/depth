"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS,
  SEAHAWKS_PLAYERS,
  Player,
  PositionSlot,
  getPlayerForSlot,
} from "@/lib/seahawks-depth-chart";
import PlayerDot from "./PlayerDot";
import PlayerCard from "./PlayerCard";

export default function DepthChartField() {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<"offense" | "defense">("offense");

  const slots = activeUnit === "offense" ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer((prev) => (prev?.id === player.id ? null : player));
  };

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: "100dvh", background: "#0a0e1a" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: "#0a0e1a" }}
      >
        <div>
          <div
            className="text-xs font-semibold tracking-widest"
            style={{ color: "#69BE28" }}
          >
            SEATTLE SEAHAWKS
          </div>
          <h1
            className="text-2xl font-black leading-tight"
            style={{ color: "#f0f4ff", letterSpacing: "-0.02em" }}
          >
            Depth Chart
          </h1>
        </div>
        {/* Unit toggle */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          {(["offense", "defense"] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => {
                setActiveUnit(unit);
                setSelectedPlayer(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
              style={{
                background: activeUnit === unit ? "#002244" : "transparent",
                color: activeUnit === unit ? "#69BE28" : "#A5ACAF",
                border: activeUnit === unit ? "1px solid rgba(105,190,40,0.4)" : "1px solid transparent",
              }}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Field */}
      <div className="flex-1 px-4 pb-8">
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            aspectRatio: "9/14",
            background: "linear-gradient(180deg, #1e3d10 0%, #2d5a1b 40%, #2d5a1b 60%, #1e3d10 100%)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.4), 0 4px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Field markings */}
          <FieldMarkings />

          {/* Player dots */}
          {slots.map((slot) => {
            const player = getPlayerForSlot(slot);
            if (!player) return null;
            return (
              <PlayerDot
                key={`${slot.position}-${slot.depth}`}
                player={player}
                slot={slot}
                isSelected={selectedPlayer?.id === player.id}
                onClick={handlePlayerClick}
                side={activeUnit}
              />
            );
          })}

          {/* Scrimmage line label */}
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
        <div className="flex gap-4 justify-center mt-4 flex-wrap">
          {[
            { label: "Starter", color: "#69BE28" },
            { label: "Backup", color: "#A5ACAF" },
            { label: "Rookie", color: "#4fc3f7" },
            { label: "Injured", color: "#ef5350" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{ width: 8, height: 8, background: color }}
              />
              <span className="text-xs" style={{ color: "#A5ACAF" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Player Card */}
      <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}

function FieldMarkings() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Yard lines */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.5"
        />
      ))}
      {/* End zones */}
      <rect x="0" y="0" width="100" height="10" fill="rgba(0,34,68,0.3)" />
      <rect x="0" y="130" width="100" height="10" fill="rgba(0,34,68,0.3)" />
      {/* Center line (scrimmage) */}
      <line
        x1="0"
        y1="70"
        x2="100"
        y2="70"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
      {/* Hash marks */}
      {[20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((y) => (
        <g key={`hash-${y}`}>
          <line x1="32" y1={y} x2="35" y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <line x1="65" y1={y} x2="68" y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        </g>
      ))}
      {/* OFFENSE / DEFENSE labels */}
      <text x="50" y="66" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.2)" fontFamily="Arial" fontWeight="bold" letterSpacing="1">OFFENSE</text>
      <text x="50" y="75" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.2)" fontFamily="Arial" fontWeight="bold" letterSpacing="1">DEFENSE</text>
    </svg>
  );
}
