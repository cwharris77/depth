"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, RotateCcw, Search, Share2, Shirt } from "lucide-react";
import type { Player, Position, TeamRoster, Unit } from "@/lib/types";
import type { TeamMeta } from "@/lib/roster-source";
import { resolveUnit } from "@/lib/formations";
import { unitForPosition } from "@/lib/search";
import { rosterShareUrlPath } from "@/lib/share";
import { readableTextOn } from "@/lib/colors";
import {
  applyTeamOverride,
  clearPositionOrder,
  clearTeamOverride,
  getTeamOverride,
  hasOverride,
  setPositionOrder,
  setTeamOverride,
  type TeamDepthOverride,
} from "@/lib/depth-overrides";
import PlayerDot from "./PlayerDot";
import PlayerCard from "./PlayerCard";
import FullScreenSheet from "./FullScreenSheet";
import BottomSheet from "./BottomSheet";
import UniformSheet from "./UniformSheet";
import NavSwitcher from "./NavSwitcher";
import OpenPlayerFromQuery from "./OpenPlayerFromQuery";
import ApplyKitFromQuery from "./ApplyKitFromQuery";
import ApplySharedOrder from "./ApplySharedOrder";

const UNIT_LABELS: Record<Unit, string> = {
  offense: "Offense",
  defense: "Defense",
  special: "Special",
};

// The uniform picker (Phase 7) is code-complete but its entry point stays hidden until:
//   1. real teams are ingested (`npm run ingest:espn`) so every team has data, and
//      the hand-curated kits are ingested (`npm run ingest:uniforms`), and
//   2. the seed carries jersey pictures (Uniform.imagePath) rather than only the
//      generated-silhouette fallback.
// Flip to true to expose the header jersey button. With it false the view renders in
// the Home kit (= team.colors), i.e. exactly as before Phase 7.
const SHOW_UNIFORM_PICKER = false;

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
  const [kitOpen, setKitOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const { team } = roster;

  // Selected uniform (roadmap Phase 7). Defaults to uniforms[0] — the synthesized Home
  // kit, i.e. the team's real colors — so the page opens exactly as before. Picking a
  // kit swaps the colors the whole view renders with (dots, card, header), so the field
  // "wears" the uniform. Reset to Home whenever the team changes.
  const [kitId, setKitId] = useState(roster.uniforms[0]?.id);
  useEffect(() => {
    setKitId(roster.uniforms[0]?.id);
  }, [roster.uniforms]);
  const activeUniform =
    roster.uniforms.find((u) => u.id === kitId) ?? roster.uniforms[0];
  const activeColors = activeUniform?.colors ?? team.colors;

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
  // Same roster (players/override), re-skinned in the selected kit's colors. One lever:
  // every child that reads team colors (dots via props, PlayerCard/NavSwitcher via
  // roster.team.colors) follows the kit through this.
  const themedRoster = useMemo(
    () => ({ ...displayRoster, team: { ...displayRoster.team, colors: activeColors } }),
    [displayRoster, activeColors],
  );
  const slots = resolveUnit(themedRoster, activeUnit);

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

  // Applying a shared roster link: persist the sender's order as this device's custom
  // order for the team, so the board matches "exactly as edited" and Reset still works.
  const handleApplySharedOrder = (shared: TeamDepthOverride) => {
    setTeamOverride(team.id, shared);
    setOverride(getTeamOverride(team.id));
  };

  // Share the roster as it currently stands — the team link, carrying the custom order
  // when there is one. Prefers the native share sheet, else copies with a brief check.
  const handleShareRoster = async () => {
    const url = window.location.origin + rosterShareUrlPath(team.id, override);
    const title = `${team.city} ${team.name} depth chart · Depth`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // share sheet dismissed / unavailable — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permission) — no-op
    }
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
              style={{ color: activeColors.uiAccent }}
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
                border: `1px solid ${activeColors.uiAccent}40`,
              }}
            >
              <h1
                className="text-[10px] font-semibold tracking-widest truncate"
                style={{ color: activeColors.uiAccent }}
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
                border: `1px solid ${activeColors.uiAccent}40`,
              }}
            >
              <Search size={14} color={activeColors.uiAccent} />
            </button>
            {SHOW_UNIFORM_PICKER && (
              <button
                type="button"
                onClick={() => setKitOpen(true)}
                aria-label="Choose uniform"
                className="shrink-0 flex items-center justify-center rounded-full p-2"
                style={{
                  touchAction: "manipulation",
                  background: "rgba(255,255,255,0.07)",
                  border: `1px solid ${activeColors.uiAccent}40`,
                }}
              >
                <Shirt size={14} color={activeColors.uiAccent} />
              </button>
            )}
            <button
              type="button"
              onClick={handleShareRoster}
              aria-label={shareCopied ? "Roster link copied" : "Share this roster"}
              className="shrink-0 flex items-center justify-center rounded-full p-2"
              style={{
                touchAction: "manipulation",
                background: shareCopied
                  ? `${activeColors.uiAccent}26`
                  : "rgba(255,255,255,0.07)",
                border: `1px solid ${activeColors.uiAccent}40`,
              }}
            >
              {shareCopied ? (
                <Check size={14} color={activeColors.uiAccent} strokeWidth={3} />
              ) : (
                <Share2 size={14} color={activeColors.uiAccent} />
              )}
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
            const activeText = readableTextOn(activeColors.primary);
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
                    activeUnit === unit ? activeColors.primary : "transparent",
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
              color: activeColors.uiAccent,
              background: `${activeColors.uiAccent}1a`,
              border: `1px solid ${activeColors.uiAccent}55`,
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
                teamPrimary={activeColors.primary}
                teamColors={activeColors}
                unit={activeUnit}
              />
            );
          })}
        </div>
      </div>

      <FullScreenSheet isOpen={navOpen}>
        <NavSwitcher
          roster={themedRoster}
          teams={teams}
          onSelectPlayer={handleNavSelectPlayer}
          onClose={() => setNavOpen(false)}
        />
      </FullScreenSheet>

      <BottomSheet isOpen={kitOpen} onClose={() => setKitOpen(false)}>
        <UniformSheet
          uniforms={roster.uniforms}
          activeId={activeUniform?.id ?? ""}
          accent={activeColors.uiAccent}
          onSelect={setKitId}
          onClose={() => setKitOpen(false)}
        />
      </BottomSheet>

      <PlayerCard
        player={displaySelected}
        roster={themedRoster}
        onClose={() => setSelectedPlayer(null)}
        onSelectPlayer={setSelectedPlayer}
        onReorder={handleReorder}
        onResetPosition={handleResetPosition}
        isPositionCustom={displaySelected ? !!override[displaySelected.position] : false}
      />

      <OpenPlayerFromQuery players={displayRoster.players} onOpen={handleNavSelectPlayer} />

      <ApplyKitFromQuery
        validIds={roster.uniforms.map((u) => u.id)}
        onApply={setKitId}
      />

      <ApplySharedOrder onApply={handleApplySharedOrder} />
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
