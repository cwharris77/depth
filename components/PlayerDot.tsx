"use client";

import { motion } from "framer-motion";
import type { Player, RenderSlot, TeamColors } from "@/lib/types";
import { readableTextOn } from "@/lib/colors";

interface PlayerDotProps {
  player: Player;
  slot: RenderSlot;
  isSelected: boolean;
  onClick: (player: Player) => void;
  teamPrimary: string;
  teamColors: TeamColors;
}

const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  return parts[parts.length - 1] ?? full;
}

export default function PlayerDot({
  player,
  slot,
  isSelected,
  onClick,
  teamPrimary,
  teamColors,
}: PlayerDotProps) {
  // Team-identity dot: real primary fill, real accent (secondary) ring — e.g. the
  // Chargers read as electric-blue center, gold ring. Selection swaps to a white
  // ring + uiAccent fill so it stays distinct from the resting team colors.
  const borderColor = isSelected ? "#fff" : teamColors.secondary;
  const bg = isSelected ? teamColors.uiAccent : teamPrimary;

  // Contrast handled on the text, not the icon: white or near-black on the fill.
  const numberColor = isSelected
    ? teamColors.onAccent
    : readableTextOn(teamPrimary);

  // Dots are positioned by their center. On-line players would straddle the line of
  // scrimmage, so push them a circle-radius (+a hair) onto their own side: offense
  // (y past 50) down, defense (y before 50) up. Keeps the whole circle behind the line.
  const lineOffset = slot.onLine ? (slot.y >= 50 ? 18 : -18) : 0;

  return (
    <button
      type="button"
      className="absolute flex flex-col items-center"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: `translate(-50%, calc(-50% + ${lineOffset}px))`,
        zIndex: isSelected ? 20 : 10,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
      onClick={() => onClick(player)}
    >
      <motion.div
        className="rounded-full flex items-center justify-center font-bold leading-none select-none"
        style={{
          width: 30,
          height: 30,
          fontSize: 11,
          color: numberColor,
          background: bg,
          border: `2px solid ${borderColor}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${teamColors.uiAccent}66`
            : "0 2px 8px rgba(0,0,0,0.5)",
        }}
        animate={{ scale: isSelected ? 1.18 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        {player.number}
      </motion.div>

      {/* Position + name. Hidden on a narrow field (number-only); shown when the field
          is wide enough (.dot-label container query in globals.css). Wraps instead of
          truncating so long names like "Smith-Njigba" stay readable. */}
      <div className="hidden min-[720px]:block mt-1 text-center" style={{ maxWidth: 72 }}>
        <div
          className="text-[8px] font-semibold"
          style={{ color: "#A5ACAF", letterSpacing: "0.05em" }}
        >
          {slot.label}
        </div>
        <div
          className="text-[9px] font-bold leading-tight"
          style={{
            color: isSelected ? teamColors.uiAccent : "#f0f4ff",
            overflowWrap: "anywhere",
          }}
        >
          {lastName(player.name)}
        </div>
      </div>
    </button>
  );
}
