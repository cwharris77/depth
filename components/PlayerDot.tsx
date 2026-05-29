"use client";

import { motion } from "framer-motion";
import { Player, PositionSlot } from "@/lib/seahawks-depth-chart";

interface PlayerDotProps {
  player: Player;
  slot: PositionSlot;
  isSelected: boolean;
  onClick: (player: Player) => void;
  side: "offense" | "defense";
}

const statusColors: Record<string, string> = {
  starter: "#69BE28",
  backup: "#A5ACAF",
  rookie: "#4fc3f7",
  injured: "#ef5350",
};

export default function PlayerDot({ player, slot, isSelected, onClick, side }: PlayerDotProps) {
  return (
    <motion.button
      className="absolute flex flex-col items-center group"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: isSelected ? 20 : 10,
      }}
      whileTap={{ scale: 0.9 }}
      onClick={() => onClick(player)}
    >
      {/* Dot */}
      <motion.div
        className="rounded-full flex items-center justify-center text-white font-bold text-[10px] leading-none select-none"
        style={{
          width: 36,
          height: 36,
          background: isSelected
            ? "#69BE28"
            : side === "offense"
            ? "#002244"
            : "#1a0a2e",
          border: `2px solid ${isSelected ? "#fff" : statusColors[player.status]}`,
          boxShadow: isSelected
            ? "0 0 0 3px rgba(105,190,40,0.4)"
            : "0 2px 8px rgba(0,0,0,0.5)",
        }}
        animate={{
          scale: isSelected ? 1.15 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {player.number}
      </motion.div>

      {/* Label below dot */}
      <div
        className="mt-1 text-center"
        style={{ width: 64 }}
      >
        <div
          className="text-[9px] font-semibold truncate"
          style={{ color: "#A5ACAF", letterSpacing: "0.05em" }}
        >
          {slot.label}
        </div>
        <div
          className="text-[10px] font-bold truncate leading-tight"
          style={{ color: isSelected ? "#69BE28" : "#f0f4ff" }}
        >
          {player.name.split(" ").pop()}
        </div>
      </div>
    </motion.button>
  );
}
