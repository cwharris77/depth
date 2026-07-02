"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Check } from "lucide-react";
import type { Conference, Player, TeamRoster } from "@/lib/types";
import type { TeamMeta } from "@/lib/roster-source";
import { readableTextOn } from "@/lib/colors";
import { unitForPosition, type PlayerHit } from "@/lib/search";

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

function PlayerRow({
  hit,
  currentTeamId,
  onSelect,
}: {
  hit: PlayerHit;
  currentTeamId: string;
  onSelect: (hit: PlayerHit) => void;
}) {
  const otherTeam = hit.team.id !== currentTeamId;
  return (
    <button
      type="button"
      onClick={() => onSelect(hit)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className="flex items-center justify-center rounded-lg text-xs font-bold shrink-0"
        style={{ width: 34, height: 34, background: "rgba(255,255,255,0.06)", color: "#f0f4ff" }}
      >
        {hit.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: "#f0f4ff" }}>
          {hit.name}
        </div>
        <div className="text-[11px]" style={{ color: "#A5ACAF" }}>
          {hit.position} · {UNIT_LABELS[unitForPosition(hit.position)]}
          {otherTeam ? ` · ${hit.team.city} ${hit.team.name}` : ""}
        </div>
      </div>
      {otherTeam && (
        <div
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: "rgba(255,255,255,0.08)", color: "#A5ACAF" }}
        >
          {hit.team.abbrev}
        </div>
      )}
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
// any of them. Teams mode groups by conference/division per the roadmap's switcher
// spec (opens on the visitor's own conference; search overrides the conference
// filter and matches all 32 by city/name/abbrev). Players mode searches every
// ingested team (app/api/players/search), not just the roster already loaded here.
export default function NavSwitcher({ roster, teams, onSelectPlayer, onClose }: NavSwitcherProps) {
  const { team } = roster;
  const accentColor = team.colors.uiAccent;
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("teams");
  const [query, setQuery] = useState("");
  const [conference, setConference] = useState<Conference>(team.conference);
  const [playerResults, setPlayerResults] = useState<PlayerHit[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  const setModeAndReset = (next: Mode) => {
    setMode(next);
    setQuery("");
    setPlayerResults([]);
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

  // Debounced so every keystroke doesn't fire a request; aborted on the next
  // keystroke/mode change so a slow earlier response can't clobber a newer one.
  useEffect(() => {
    if (mode !== "players" || !searching) {
      setPlayerResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPlayersLoading(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setPlayerResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setPlayerResults([]);
      } finally {
        setPlayersLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, query, searching]);

  const handleSelectPlayer = (hit: PlayerHit) => {
    if (hit.team.id === team.id) {
      // Already have the full Player (depthRank/status/bio/...) for the current
      // roster — use that instead of the lighter search-result shape.
      const localPlayer = roster.players.find((p) => p.id === hit.id);
      if (localPlayer) {
        onSelectPlayer(localPlayer);
        onClose();
        return;
      }
    }
    // Different team: navigate there and open the player once its roster loads
    // (OpenPlayerFromQuery on the destination page reads `?player=`).
    router.push(`/team/${hit.team.id}?player=${hit.id}`);
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
            Search any player across all 32 teams by name, number, or position
          </div>
        ) : playersLoading && playerResults.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
            Searching…
          </div>
        ) : playerResults.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
            No players match &ldquo;{query.trim()}&rdquo;
          </div>
        ) : (
          <div className="px-3">
            {playerResults.map((hit) => (
              <PlayerRow key={hit.id} hit={hit} currentTeamId={team.id} onSelect={handleSelectPlayer} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
