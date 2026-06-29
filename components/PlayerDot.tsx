"use client";

import { motion } from "framer-motion";
import type { Player, RenderSlot, TeamColors, Unit } from "@/lib/types";
import { statusColor } from "@/lib/colors";

interface PlayerDotProps {
  player: Player;
  slot: RenderSlot;
  isSelected: boolean;
  onClick: (player: Player) => void;
  side: Unit;
  teamPrimary: string;
  teamColors: TeamColors;
}

// Defense/special dot backgrounds stay fixed dark tones; offense uses the team's
// (controlled-contrast) primary. The dot number is always white on these dark fills.
const bgBySide: Record<Unit, string> = {
  offense: "#002244",
  defense: "#1a0a2e",
  special: "#3a2a05",
};

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
  side,
  teamPrimary,
  teamColors,
}: PlayerDotProps) {
  const borderColor = isSelected ? "#fff" : statusColor(player.status, teamColors);

  const bg = isSelected
    ? teamColors.uiAccent
    : side === "offense"
    ? teamPrimary
    : bgBySide[side];

  // When selected the fill is uiAccent, so the number needs the on-accent text color.
  const numberColor = isSelected ? teamColors.onAccent : "#fff";

  return (
    <button
      type="button"
      className="absolute flex flex-col items-center"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: "translate(-50%, -50%)",
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

      <div className="mt-1 text-center" style={{ width: 44 }}>
        <div
          className="text-[8px] font-semibold truncate"
          style={{ color: "#A5ACAF", letterSpacing: "0.05em" }}
        >
          {slot.label}
        </div>
        <div
          className="text-[9px] font-bold truncate leading-tight"
          style={{ color: isSelected ? teamColors.uiAccent : "#f0f4ff" }}
        >
          {lastName(player.name)}
        </div>
      </div>
    </button>
  );
}
