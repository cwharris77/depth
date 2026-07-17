'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Check, CornerDownLeft } from 'lucide-react';
import type { Conference, Player, TeamRoster } from '@/lib/types';
import type { TeamMeta } from '@/lib/roster-source';
import { readableTextOn } from '@/lib/colors';
import type { PlayerHit } from '@/lib/search';

type ResultItem = { type: 'player'; hit: PlayerHit } | { type: 'team'; team: TeamMeta };

const DIVISION_ORDER = ['East', 'North', 'South', 'West'] as const;

function groupByDivision(teams: TeamMeta[], conference: Conference) {
  return DIVISION_ORDER.map((division) => ({
    conference,
    division,
    teams: teams
      .filter((t) => t.conference === conference && t.division === division)
      .sort((a, b) => a.city.localeCompare(b.city)),
  })).filter((g) => g.teams.length > 0);
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      className="text-[10px] font-semibold tracking-widest px-5 py-2"
      style={{ color: '#A5ACAF' }}>
      {children}
    </div>
  );
}

function PlayerAvatar({ hit }: { hit: PlayerHit }) {
  const [errored, setErrored] = useState(false);
  const photoUrl = hit.photoUrl;
  const showPhoto = Boolean(photoUrl) && !errored;
  return (
    <div
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
      {showPhoto && photoUrl ? (
        <Image
          src={photoUrl}
          alt={hit.name}
          width={36}
          height={36}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          style={{ width: '60%', height: '60%', opacity: 0.5, color: '#A5ACAF' }}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4z" />
        </svg>
      )}
    </div>
  );
}

function TeamRow({
  team,
  isCurrent,
  highlighted,
  disabled,
  onSelect,
  onHover,
}: {
  team: TeamMeta;
  isCurrent: boolean;
  highlighted: boolean;
  disabled: boolean;
  onSelect: (team: TeamMeta) => void;
  onHover: () => void;
}) {
  const badgeText = readableTextOn(team.colors.primary);
  return (
    <Link
      href={`/team/${team.id}`}
      aria-disabled={disabled}
      onClick={(e) => {
        // Navigate through selectTeam (useTransition) instead of Link's own
        // navigation, so the parent can hold the sheet open until the transition
        // commits — see the useTransition guard in NavSwitcher.
        e.preventDefault();
        if (disabled) return;
        onSelect(team);
      }}
      onMouseEnter={onHover}
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        touchAction: 'manipulation',
        pointerEvents: disabled ? 'none' : undefined,
        opacity: disabled ? 0.5 : 1,
        background: highlighted
          ? 'rgba(255,255,255,0.06)'
          : isCurrent
            ? `${team.colors.primary}1a`
            : 'transparent',
      }}>
      <div
        className="shrink-0 rounded-lg flex items-center justify-center font-black text-[11px]"
        style={{
          width: 32,
          height: 32,
          background: team.colors.primary,
          color: badgeText,
          border: `1px solid ${team.colors.secondary}`,
        }}>
        {team.abbrev}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: '#f0f4ff' }}>
          {team.city} {team.name}
        </div>
        <div className="text-[11px]" style={{ color: '#A5ACAF' }}>
          {team.conference} {team.division}
        </div>
      </div>
      {isCurrent && <Check size={16} color={team.colors.uiAccent} strokeWidth={3} />}
      {highlighted && <CornerDownLeft size={14} color="#A5ACAF" />}
    </Link>
  );
}

function PlayerRow({
  hit,
  highlighted,
  disabled,
  onSelect,
  onHover,
}: {
  hit: PlayerHit;
  highlighted: boolean;
  disabled: boolean;
  onSelect: (hit: PlayerHit) => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(hit)}
      onMouseEnter={onHover}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      style={{
        touchAction: 'manipulation',
        opacity: disabled ? 0.5 : 1,
        background: highlighted ? 'rgba(255,255,255,0.06)' : 'transparent',
      }}>
      <PlayerAvatar hit={hit} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: '#f0f4ff' }}>
          {hit.name}
        </div>
        <div className="text-[11px] truncate" style={{ color: '#A5ACAF' }}>
          {hit.position} · {hit.team.name} · #{hit.number}
          {hit.college ? ` · ${hit.college}` : ''}
        </div>
      </div>
      {highlighted && <CornerDownLeft size={14} color="#A5ACAF" />}
    </button>
  );
}

interface NavSwitcherProps {
  roster: TeamRoster;
  teams: TeamMeta[];
  onSelectPlayer: (player: Player) => void;
  onClose: () => void;
}

// The app's full-screen nav. Idle (no query): browse teams by conference/division,
// the AFC/NFC picker choosing which. Typing searches both teams and players at once
// — no mode switch needed. Players search hits every ingested team
// (app/api/players/search), not just the roster already loaded here. Arrow keys move
// the result highlight, Enter activates it, Escape closes — a lightweight
// command-palette pattern.
export default function NavSwitcher({ roster, teams, onSelectPlayer, onClose }: NavSwitcherProps) {
  const { team } = roster;
  const accentColor = team.colors.uiAccent;
  const router = useRouter();
  const [conference, setConference] = useState<Conference>(team.conference);
  const [query, setQuery] = useState('');
  const [playerResults, setPlayerResults] = useState<PlayerHit[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Navigating (team/player selection) is wrapped in a transition so the sheet
  // stays open — and its rows disabled — until the destination is ready, instead
  // of closing immediately and flashing the still-mounted old team's field
  // (components/DepthChartField.tsx persists across the transition; only its
  // props change once navigation commits). See the "Janky page navigation" ticket.
  const [isPending, startTransition] = useTransition();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending) {
      onClose();
    }
    wasPending.current = isPending;
  }, [isPending, onClose]);

  // Autofocus only for pointer/keyboard devices (the command-palette feel this
  // was designed for). On touch devices it would pop the virtual keyboard the
  // instant the switcher opens, covering half the sheet before the user's asked
  // for it.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      searchInputRef.current?.focus();
    }
  }, []);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const teamResults = useMemo(() => {
    if (!searching) return [];
    return teams.filter(
      (t) =>
        t.city.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.abbrev.toLowerCase().includes(q)
    );
  }, [teams, q, searching]);

  // Debounced so every keystroke doesn't fire a request; aborted on the next
  // keystroke so a slow earlier response can't clobber a newer one.
  useEffect(() => {
    if (!searching) {
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
        if ((err as Error).name !== 'AbortError') setPlayerResults([]);
      } finally {
        setPlayersLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searching]);

  // Players first, then teams — matches the section order below. Only populated
  // while searching; idle "Teams" browsing isn't keyboard-navigable (it's a list to
  // scroll, not a single ranked result set).
  const flatResults: ResultItem[] = useMemo(() => {
    if (!searching) return [];
    return [
      ...playerResults.map((hit): ResultItem => ({ type: 'player', hit })),
      ...teamResults.map((t): ResultItem => ({ type: 'team', team: t })),
    ];
  }, [searching, playerResults, teamResults]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [flatResults]);

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
    startTransition(() => {
      router.push(`/team/${hit.team.id}?player=${hit.id}`);
    });
  };

  const selectTeam = (t: TeamMeta) => {
    startTransition(() => {
      router.push(`/team/${t.id}`);
    });
  };

  const activate = (item: ResultItem) => {
    if (item.type === 'player') handleSelectPlayer(item.hit);
    else selectTeam(item.team);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (!flatResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(flatResults[highlightedIndex]);
    }
  };

  const teamGroups = searching ? [] : groupByDivision(teams, conference);

  const showPlayers = searching && playerResults.length > 0;
  const showTeams = searching && teamResults.length > 0;
  const nothingFound = searching && !playersLoading && !showPlayers && !showTeams;

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-3 pb-3">
        <h2 className="text-lg font-black" style={{ color: '#f0f4ff' }}>
          Jump to
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2"
          style={{ background: 'rgba(255,255,255,0.08)', touchAction: 'manipulation' }}>
          <X size={18} color="#A5ACAF" />
        </button>
      </div>

      <div className="px-5 pb-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 transition-shadow duration-150"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${accentColor}55`,
            boxShadow: searchFocused ? `0 0 0 3px ${accentColor}4d` : 'none',
          }}>
          <Search size={16} color={accentColor} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search teams or players"
            className="flex-1 bg-transparent outline-none py-2.5 text-base"
            style={{ color: '#f0f4ff' }}
          />
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#A5ACAF' }}>
            ESC
          </span>
        </div>
      </div>

      {/* Only meaningful for idle browsing — hidden once you're searching. */}
      {!searching && (
        <div className="px-5 pb-3">
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            {(['AFC', 'NFC'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConference(c)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: conference === c ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: conference === c ? '#f0f4ff' : '#A5ACAF',
                  touchAction: 'manipulation',
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-y-auto pb-2 flex-1">
        {!searching ? (
          teamGroups.map((g) => (
            <div key={`${g.conference}-${g.division}`} className="mb-2">
              <SectionLabel>{`${g.conference} ${g.division.toUpperCase()}`}</SectionLabel>
              <div
                className="mx-5 rounded-2xl overflow-hidden divide-y divide-white/5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                {g.teams.map((t) => (
                  <TeamRow
                    key={t.id}
                    team={t}
                    isCurrent={t.id === team.id}
                    highlighted={false}
                    disabled={isPending}
                    onSelect={selectTeam}
                    onHover={() => {}}
                  />
                ))}
              </div>
            </div>
          ))
        ) : nothingFound ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: '#A5ACAF' }}>
            No matches for &ldquo;{query.trim()}&rdquo;
          </div>
        ) : (
          <>
            {showPlayers && (
              <div className="mb-2">
                <SectionLabel>PLAYERS</SectionLabel>
                <div className="px-3">
                  {playerResults.map((hit, i) => (
                    <PlayerRow
                      key={hit.id}
                      hit={hit}
                      highlighted={i === highlightedIndex}
                      disabled={isPending}
                      onSelect={handleSelectPlayer}
                      onHover={() => setHighlightedIndex(i)}
                    />
                  ))}
                </div>
              </div>
            )}
            {showTeams && (
              <div className="mb-2">
                <SectionLabel>TEAMS</SectionLabel>
                <div
                  className="mx-5 rounded-2xl overflow-hidden divide-y divide-white/5"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                  {teamResults.map((t, i) => (
                    <TeamRow
                      key={t.id}
                      team={t}
                      isCurrent={t.id === team.id}
                      highlighted={playerResults.length + i === highlightedIndex}
                      disabled={isPending}
                      onSelect={selectTeam}
                      onHover={() => setHighlightedIndex(playerResults.length + i)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
