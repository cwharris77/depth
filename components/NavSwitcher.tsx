"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Check } from "lucide-react";
import type { Conference, Player, TeamRoster } from "@/lib/types";
import type { TeamMeta } from "@/lib/roster-source";
import { readableTextOn } from "@/lib/colors";
import { searchPlayers, unitForPosition } from "@/lib/search";

type Mode = "teams" | "players";

const DIVISION_ORDER = ["East", "North", "South", "West"] as const;
const UNIT_LABELS = { offense: "Offense", defense: "Defense", special: "Special" } as const;

function groupByDivision(teams: TeamMeta[], conference: Conference) {
  return DIVISION_ORDER.map((division) => ({
    division,
    teams: teams
      .filter((t) => t.conference === conference && t.division === division)
      .sort((a, b) => a.city.localeCompare(b.city)),
  })).filter((g) => g.teams.length > 0);
}

function TeamRow({
  team,
  isCurrent,
  onSelect,
}: {
  team: TeamMeta;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const badgeText = readableTextOn(team.colors.primary);
  return (
    <Link
      href={`/team/${team.id}`}
      onClick={onSelect}
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        touchAction: "manipulation",
        background: isCurrent ? `${team.colors.primary}1a` : "transparent",
      }}
    >
      <div
        className="shrink-0 rounded-lg flex items-center justify-center font-black text-[11px]"
        style={{ width: 32, height: 32, background: team.colors.primary, color: badgeText }}
      >
        {team.abbrev}
      </div>
      <span className="flex-1 min-w-0 text-sm font-bold" style={{ color: "#f0f4ff" }}>
        {team.city} {team.name}
      </span>
      {isCurrent && <Check size={16} color={team.colors.uiAccent} strokeWidth={3} />}
    </Link>
  );
}

function PlayerRow({ player, onSelect }: { player: Player; onSelect: (p: Player) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className="flex items-center justify-center rounded-lg text-xs font-bold shrink-0"
        style={{ width: 34, height: 34, background: "rgba(255,255,255,0.06)", color: "#f0f4ff" }}
      >
        {player.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: "#f0f4ff" }}>
          {player.name}
        </div>
        <div className="text-[11px]" style={{ color: "#A5ACAF" }}>
          {player.position} · {UNIT_LABELS[unitForPosition(player.position)]}
        </div>
      </div>
    </button>
  );
}

interface NavSwitcherProps {
  roster: TeamRoster;
  teams: TeamMeta[];
  onSelectPlayer: (player: Player) => void;
  onClose: () => void;
}

// The app's full-screen nav: jump to another of the 32 teams, or find a player on
// the team you're viewing. Teams mode groups by conference/division per the
// roadmap's switcher spec (opens on the visitor's own conference; search overrides
// the conference filter and matches all 32 by city/name/abbrev). Players mode
// reuses the roadmap 5c search, scoped to the current roster.
export default function NavSwitcher({ roster, teams, onSelectPlayer, onClose }: NavSwitcherProps) {
  const { team } = roster;
  const accentColor = team.colors.uiAccent;
  const [mode, setMode] = useState<Mode>("teams");
  const [query, setQuery] = useState("");
  const [conference, setConference] = useState<Conference>(team.conference);

  const setModeAndReset = (next: Mode) => {
    setMode(next);
    setQuery("");
  };

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const teamResults = useMemo(() => {
    if (!searching) return [];
    return teams.filter(
      (t) =>
        t.city.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.abbrev.toLowerCase().includes(q),
    );
  }, [teams, q, searching]);

  const teamGroups = searching
    ? [{ division: "Results", teams: teamResults }]
    : groupByDivision(teams, conference);

  const playerResults = mode === "players" ? searchPlayers(roster, query) : [];

  const handleSelectPlayer = (p: Player) => {
    onSelectPlayer(p);
    onClose();
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-3 pb-3">
        <h2 className="text-lg font-black" style={{ color: "#f0f4ff" }}>
          Jump to
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2"
          style={{ background: "rgba(255,255,255,0.08)", touchAction: "manipulation" }}
        >
          <X size={18} color="#A5ACAF" />
        </button>
      </div>

      <div className="px-5 pb-3">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "rgba(255,255,255,0.07)" }}>
          {(["teams", "players"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeAndReset(m)}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
              style={{
                background: mode === m ? team.colors.primary : "transparent",
                color: mode === m ? accentColor : "#A5ACAF",
                touchAction: "manipulation",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accentColor}55` }}
        >
          <Search size={16} color={accentColor} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "teams" ? "Search teams" : "Search players"}
            className="flex-1 bg-transparent outline-none py-2.5 text-base"
            style={{ color: "#f0f4ff" }}
          />
        </div>
      </div>

      {mode === "teams" && !searching && (
        <div className="px-5 pb-3">
          <div className="flex rounded-xl p-1 gap-1" style={{ background: "rgba(255,255,255,0.07)" }}>
            {(["AFC", "NFC"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConference(c)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: conference === c ? "rgba(255,255,255,0.12)" : "transparent",
                  color: conference === c ? "#f0f4ff" : "#A5ACAF",
                  touchAction: "manipulation",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-y-auto pb-4 flex-1">
        {mode === "teams" ? (
          teamGroups.every((g) => g.teams.length === 0) ? (
            <div className="px-5 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
              No teams match &ldquo;{query.trim()}&rdquo;
            </div>
          ) : (
            teamGroups.map((g) => (
              <div key={g.division} className="mb-2">
                <div
                  className="text-[10px] font-semibold tracking-widest px-5 py-2"
                  style={{ color: "#A5ACAF" }}
                >
                  {searching ? "RESULTS" : `${conference} ${g.division.toUpperCase()}`}
                </div>
                <div
                  className="mx-5 rounded-2xl overflow-hidden divide-y divide-white/5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {g.teams.map((t) => (
                    <TeamRow key={t.id} team={t} isCurrent={t.id === team.id} onSelect={onClose} />
                  ))}
                </div>
              </div>
            ))
          )
        ) : query.trim() === "" ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
            Search any player on the {team.city} {team.name} by name, number, or position
          </div>
        ) : playerResults.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
            No players match &ldquo;{query.trim()}&rdquo;
          </div>
        ) : (
          <div className="px-3">
            {playerResults.map((p) => (
              <PlayerRow key={p.id} player={p} onSelect={handleSelectPlayer} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
