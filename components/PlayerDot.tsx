'use client';

import { motion } from 'framer-motion';
import type { Player, RenderSlot, TeamColors, Unit } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import { positionFullName } from '@/lib/positions';
import { colors as uiTokens } from '@/components/ui/tokens';

interface PlayerDotProps {
  player: Player;
  slot: RenderSlot;
  isSelected: boolean;
  onClick: (player: Player) => void;
  teamPrimary: string;
  teamColors: TeamColors;
  unit: Unit;
}

// How tightly each unit's dots pack together determines when names start
// colliding, so the label breakpoint is per-unit rather than one shared width.
// Offense (OL shoulder-to-shoulder) needs the most room; special teams (~5
// players spread across the whole field) never collide, so its names are
// always visible.
const LABEL_VISIBILITY: Record<Unit, string> = {
  offense: 'hidden min-[720px]:block',
  defense: 'hidden min-[520px]:block',
  special: 'block',
};

const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);

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
  unit,
}: PlayerDotProps) {
  // Team-identity dot: real primary fill, real accent (secondary) ring — e.g. the
  // Chargers read as electric-blue center, gold ring. Selection swaps to a white
  // ring + uiAccent fill so it stays distinct from the resting team colors.
  const borderColor = isSelected ? '#fff' : teamColors.secondary;
  const bg = isSelected ? teamColors.uiAccent : teamPrimary;

  // Contrast handled on the text, not the icon: white or near-black on the fill.
  const numberColor = isSelected ? teamColors.onAccent : readableTextOn(teamPrimary);

  // Dots are positioned by their center. On-line players would straddle the line of
  // scrimmage, so push them a circle-radius (+a hair) onto their own side: offense
  // (y past 50) down, defense (y before 50) up. Keeps the whole circle behind the line.
  const lineOffset = slot.onLine ? (slot.y >= 50 ? 18 : -18) : 0;

  return (
    <button
      type="button"
      // The visible name/position label is display:none at mobile widths
      // (LABEL_VISIBILITY), so without this a screen reader announces the dot as
      // just its jersey number. Name it explicitly so it's identifiable everywhere.
      aria-label={`${player.name}, ${positionFullName(player.position)} #${player.number}`}
      aria-pressed={isSelected}
      className="absolute flex flex-col items-center"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: `translate(-50%, calc(-50% + ${lineOffset}px))`,
        zIndex: isSelected ? 20 : 10,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        background: 'transparent',
        border: 'none',
        // Invisible hit-slop: the visual dot is 30px, below the 44px touch-target
        // guideline, so pad the tappable area without enlarging what's drawn.
        padding: 7,
        cursor: 'pointer',
      }}
      onClick={() => onClick(player)}>
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
            : `0 2px 8px ${uiTokens.scrimLight}`,
        }}
        animate={{ scale: isSelected ? 1.18 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
        {player.number}
      </motion.div>

      {/* Position + name. Breakpoint varies per unit (LABEL_VISIBILITY) since name
          collisions depend on how tightly that unit's dots are packed, not screen
          width alone. Wraps instead of truncating so long names like
          "Smith-Njigba" stay readable. Font size and top margin are clamped to
          viewport height (not a fixed px size) so labels shrink ahead of colliding
          when the field's available height shrinks — e.g. a short/landscape or
          split-screen viewport, where dots are still spaced by % of container
          height but a fixed-size label no longer fits between them. */}
      <div
        className={`${LABEL_VISIBILITY[unit]} text-center`}
        style={{ maxWidth: 72, marginTop: 'clamp(1px, 0.5dvh, 4px)' }}>
        <div
          className="font-semibold"
          style={{
            color: uiTokens.textMuted,
            letterSpacing: '0.05em',
            fontSize: 'clamp(6px, 1.1dvh, 8px)',
          }}>
          {slot.label}
        </div>
        <div
          className="font-bold leading-tight"
          style={{
            color: isSelected ? teamColors.uiAccent : uiTokens.textPrimary,
            overflowWrap: 'anywhere',
            fontSize: 'clamp(7px, 1.3dvh, 9px)',
          }}>
          {lastName(player.name)}
        </div>
      </div>
    </button>
  );
}
