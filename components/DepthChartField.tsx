"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Search } from "lucide-react";
import type { Player, Position, TeamRoster, Unit } from "@/lib/types";
import type { TeamMeta } from "@/lib/roster-source";
import { resolveUnit } from "@/lib/formations";
import { unitForPosition } from "@/lib/search";
import { readableTextOn } from "@/lib/colors";
import {
  applyTeamOverride,
  clearPositionOrder,
  clearTeamOverride,
  getTeamOverride,
  hasOverride,
  setPositionOrder,
  type TeamDepthOverride,
} from "@/lib/depth-overrides";
import PlayerDot from "./PlayerDot";
import PlayerCard from "./PlayerCard";
import FullScreenSheet from "./FullScreenSheet";
import NavSwitcher from "./NavSwitcher";
import OpenPlayerFromQuery from "./OpenPlayerFromQuery";

const UNIT_LABELS: Record<Unit, string> = {
  offense: "Offense",
  defense: "Defense",
  special: "Special",
};

// Pure client component: it receives one resolved roster as a prop and never
// imports the team registry, so a page ships only its own team's data — not all 32.
export default function DepthChartField({
  roster,
  teams,
}: {
  roster: TeamRoster;
  teams: TeamMeta[];
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>("offense");
  const [navOpen, setNavOpen] = useState(false);

  const { team } = roster;

  // The user's custom depth ordering for this team (localStorage). Applied to the roster
  // everything below renders from, so a reorder flows to the field dots and the card.
  const [override, setOverride] = useState<TeamDepthOverride>({});
  useEffect(() => {
    setOverride(getTeamOverride(team.id));
  }, [team.id]);

  const displayRoster = useMemo(
    () => applyTeamOverride(roster, override),
    [roster, override],
  );
  const slots = resolveUnit(displayRoster, activeUnit);

  // Keep the open card's player in sync with the reordered roster (fresh depthRank/status).
  const displaySelected = selectedPlayer
    ? (displayRoster.players.find((p) => p.id === selectedPlayer.id) ?? selectedPlayer)
    : null;

  const handleReorder = (position: Position, orderedIds: string[]) => {
    setPositionOrder(team.id, position, orderedIds);
    setOverride(getTeamOverride(team.id));
  };

  const handleResetPosition = (position: Position) => {
    clearPositionOrder(team.id, position);
    setOverride(getTeamOverride(team.id));
  };

  const handleResetTeam = () => {
    clearTeamOverride(team.id);
    setOverride({});
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer((prev) => (prev?.id === player.id ? null : player));
  };

  // A player picked from the nav's player search jumps the field to their unit,
  // then opens them — same behavior the old header search had.
  const handleNavSelectPlayer = (player: Player) => {
    setActiveUnit(unitForPosition(player.position));
    setSelectedPlayer(player);
  };

  return (
    <div
      className="flex flex-col mx-auto w-full"
      style={{
        height: "100dvh",
        maxWidth: 720,
        overflow: "hidden",
        background: "#0a0e1a",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        className="px-5 pb-3"
        style={{
          background: "#0a0e1a",
          flex: "0 0 auto",
          paddingTop: "max(env(safe-area-inset-top), 12px)",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Wordmark — fixed, non-interactive brand element, on the left. */}
          <div className="flex items-center gap-0.5 shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: team.colors.uiAccent }}
            >
              <rect x="1" y="2.5" width="11" height="2" rx="1" fill="currentColor" />
              <rect x="1" y="7" width="8" height="2" rx="1" fill="currentColor" />
              <rect x="1" y="11.5" width="5" height="2" rx="1" fill="currentColor" />
            </svg>
            <span className="text-sm font-bold tracking-widest" style={{ color: "#A5ACAF" }}>
              depth
            </span>
          </div>
          {/* Team/unit switcher trigger — on the right, where users (Mia, Caleb)
              instinctively tapped expecting a menu. Styled as a visible pill, not
              plain text, so it reads as tappable. A search-icon circle sits beside
              it as a direct jump into the switcher's search bar. */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Switch team or search players"
              className="flex items-center gap-1.5 text-left min-w-0 rounded-full pl-3 pr-2 py-1.5"
              style={{
                touchAction: "manipulation",
                background: "rgba(255,255,255,0.07)",
                border: `1px solid ${team.colors.uiAccent}40`,
              }}
            >
              <h1
                className="text-[10px] font-semibold tracking-widest truncate"
                style={{ color: team.colors.uiAccent }}
              >
                {team.city.toUpperCase()} {team.name.toUpperCase()}
              </h1>
              <ChevronDown size={14} color="#A5ACAF" className="shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Search teams or players"
              className="shrink-0 flex items-center justify-center rounded-full p-2"
              style={{
                touchAction: "manipulation",
                background: "rgba(255,255,255,0.07)",
                border: `1px solid ${team.colors.uiAccent}40`,
              }}
            >
              <Search size={14} color={team.colors.uiAccent} />
            </button>
          </div>
        </div>
        {/* On its own row, 24px below the header line, so it never crowds the
            team-switcher tap target the way sharing a row used to. */}
        <div
          className="flex rounded-xl p-1 gap-1 mt-6"
          style={{ background: "rgba(255,255,255,0.07)", width: "fit-content" }}
        >
          {(["offense", "defense", "special"] as const).map((unit) => {
            // The pill fills with the team's brand primary, which can be any
            // hue — uiAccent is only guaranteed to read on the dark app
            // background, not on primary (e.g. Chiefs' #FF4D5E uiAccent on
            // its #E31837 primary is ~1.45:1, illegible red-on-red). Derive
            // the label color from primary itself instead.
            const activeText = readableTextOn(team.colors.primary);
            return (
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
                  color: activeUnit === unit ? activeText : "#A5ACAF",
                  border:
                    activeUnit === unit
                      ? `1px solid ${activeText}66`
                      : "1px solid transparent",
                  touchAction: "manipulation",
                }}
              >
                {UNIT_LABELS[unit]}
              </button>
            );
          })}
        </div>
        {/* Tells the user this team's depth is their custom order, with one-tap revert. */}
        {hasOverride(override) && (
          <button
            type="button"
            onClick={handleResetTeam}
            className="flex items-center gap-1 mt-3 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              color: team.colors.uiAccent,
              background: `${team.colors.uiAccent}1a`,
              border: `1px solid ${team.colors.uiAccent}55`,
              width: "fit-content",
              touchAction: "manipulation",
            }}
          >
            <RotateCcw size={11} /> Custom order · Reset all
          </button>
        )}
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
                teamPrimary={team.colors.primary}
                teamColors={team.colors}
                unit={activeUnit}
              />
            );
          })}
        </div>
      </div>

      <FullScreenSheet isOpen={navOpen}>
        <NavSwitcher
          roster={displayRoster}
          teams={teams}
          onSelectPlayer={handleNavSelectPlayer}
          onClose={() => setNavOpen(false)}
        />
      </FullScreenSheet>

      <PlayerCard
        player={displaySelected}
        roster={displayRoster}
        onClose={() => setSelectedPlayer(null)}
        onSelectPlayer={setSelectedPlayer}
        onReorder={handleReorder}
        onResetPosition={handleResetPosition}
        isPositionCustom={displaySelected ? !!override[displaySelected.position] : false}
      />

      <OpenPlayerFromQuery players={displayRoster.players} onOpen={handleNavSelectPlayer} />
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
      {/* line of scrimmage — solid blue, matching TV broadcast overlays */}
      <line x1="0" y1="50" x2="100" y2="50" stroke="#2d6fe0" strokeWidth="0.6" />
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
