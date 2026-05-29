"use client";

import { motion } from "framer-motion";
import type { Player, FieldSlot, Unit } from "@/lib/types";

interface PlayerDotProps {
  player: Player;
  slot: FieldSlot;
  isSelected: boolean;
  onClick: (player: Player) => void;
  side: Unit;
  teamPrimary: string;
  teamSecondary: string;
}

const statusColors: Record<string, string> = {
  starter: "#69BE28",
  backup: "#A5ACAF",
  rookie: "#4fc3f7",
  injured: "#ef5350",
};

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
  teamSecondary,
}: PlayerDotProps) {
  const borderColor = isSelected
    ? "#fff"
    : statusColors[player.status] ?? teamSecondary;

  const bg = isSelected
    ? teamSecondary
    : side === "offense"
    ? teamPrimary
    : bgBySide[side];

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
        className="rounded-full flex items-center justify-center text-white font-bold leading-none select-none"
        style={{
          width: 30,
          height: 30,
          fontSize: 11,
          background: bg,
          border: `2px solid ${borderColor}`,
          boxShadow: isSelected
            ? "0 0 0 3px rgba(105,190,40,0.4)"
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
          style={{ color: isSelected ? teamSecondary : "#f0f4ff" }}
        >
          {lastName(player.name)}
        </div>
      </div>
    </button>
  );
}
