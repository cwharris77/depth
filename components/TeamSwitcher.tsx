"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Check } from "lucide-react";
import type { Conference } from "@/lib/types";
import type { TeamMeta } from "@/lib/roster-source";
import { readableTextOn } from "@/lib/colors";

const DIVISION_ORDER = ["East", "North", "South", "West"] as const;

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

interface TeamSwitcherProps {
  teams: TeamMeta[];
  currentTeamId: string;
  currentConference: Conference;
  accentColor: string;
  onClose: () => void;
}

// Full-screen sheet (rendered inside a SlideDownSheet by the caller) for jumping to
// any of the 32 teams. Opens on the visitor's own conference, grouped by division per
// the roadmap's switcher spec; search overrides the conference filter and matches
// across all 32 teams by city, name, or abbreviation.
export default function TeamSwitcher({
  teams,
  currentTeamId,
  currentConference,
  accentColor,
  onClose,
}: TeamSwitcherProps) {
  const [query, setQuery] = useState("");
  const [conference, setConference] = useState<Conference>(currentConference);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const searchResults = useMemo(() => {
    if (!searching) return [];
    return teams.filter(
      (t) =>
        t.city.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.abbrev.toLowerCase().includes(q),
    );
  }, [teams, q, searching]);

  const groups = searching
    ? [{ division: "Results", teams: searchResults }]
    : groupByDivision(teams, conference);

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-3 pb-3">
        <h2 className="text-lg font-black" style={{ color: "#f0f4ff" }}>
          Switch Team
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
        <div
          className="flex items-center gap-2 rounded-xl px-3"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accentColor}55` }}
        >
          <Search size={16} color={accentColor} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams"
            className="flex-1 bg-transparent outline-none py-2.5 text-base"
            style={{ color: "#f0f4ff" }}
          />
        </div>
      </div>

      {!searching && (
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

      <div className="overflow-y-auto pb-4" style={{ maxHeight: "calc(85dvh - 140px)" }}>
        {groups.every((g) => g.teams.length === 0) ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: "#A5ACAF" }}>
            No teams match &ldquo;{query.trim()}&rdquo;
          </div>
        ) : (
          groups.map((g) => (
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
                  <TeamRow
                    key={t.id}
                    team={t}
                    isCurrent={t.id === currentTeamId}
                    onSelect={onClose}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
