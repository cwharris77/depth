'use client';

import Avatar from '@/components/ui/Avatar';
import IconButton from '@/components/ui/IconButton';
import SectionLabel from '@/components/ui/SectionLabel';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { colors as uiTokens } from '@/components/ui/tokens';
import { readableTextOn } from '@/lib/colors';
import type { TeamMeta } from '@/lib/roster-source';
import type { PlayerHit } from '@/lib/search';
import type { Conference, Player } from '@/lib/types';
import { Check, CornerDownLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

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
          ? uiTokens.surfaceRaised
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
        <div className="text-sm font-bold truncate" style={{ color: uiTokens.textPrimary }}>
          {team.city} {team.name}
        </div>
        <div className="text-[11px]" style={{ color: uiTokens.textMuted }}>
          {team.conference} {team.division}
        </div>
      </div>
      {isCurrent && <Check size={16} color={team.colors.uiAccent} strokeWidth={3} />}
      {highlighted && <CornerDownLeft size={14} color={uiTokens.textMuted} />}
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
        background: highlighted ? uiTokens.surfaceRaised : 'transparent',
      }}>
      <Avatar photoUrl={hit.photoUrl} name={hit.name} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate" style={{ color: uiTokens.textPrimary }}>
          {hit.name}
        </div>
        <div className="text-[11px] truncate" style={{ color: uiTokens.textMuted }}>
          {hit.position} · {hit.team.name} · #{hit.number}
          {hit.college ? ` · ${hit.college}` : ''}
        </div>
      </div>
      {highlighted && <CornerDownLeft size={14} color={uiTokens.textMuted} />}
    </button>
  );
}

interface NavSwitcherProps {
  team: TeamMeta;
  teams: TeamMeta[];
  // Full player list for the currently-viewed team, when the caller has it loaded
  // (the roster page does; the stats page doesn't — see components/TeamStatsView.tsx).
  // Selecting a player already on this team opens them in place via onSelectPlayer;
  // without this, or for any other team, selection navigates to that team's roster
  // page instead (?player=<id>, opened there by OpenPlayerFromQuery).
  currentTeamPlayers?: Player[];
  onSelectPlayer: (player: Player) => void;
  onClose: () => void;
}

// The app's full-screen nav. Idle (no query): browse teams by conference/division,
// the AFC/NFC picker choosing which. Typing searches both teams and players at once
// — no mode switch needed. Players search hits every ingested team
// (app/api/players/search), not just the roster already loaded here. Arrow keys move
// the result highlight, Enter activates it, Escape closes — a lightweight
// command-palette pattern.
export default function NavSwitcher({
  team,
  teams,
  currentTeamPlayers = [],
  onSelectPlayer,
  onClose,
}: NavSwitcherProps) {
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
      const localPlayer = currentTeamPlayers.find((p) => p.id === hit.id);
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
        <h2 className="text-lg font-black" style={{ color: uiTokens.textPrimary }}>
          Jump to
        </h2>
        <IconButton
          variant="plain"
          onClick={onClose}
          ariaLabel="Close"
          icon={<X size={18} color={uiTokens.textMuted} />}
        />
      </div>

      <div className="px-5 pb-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 transition-shadow duration-150"
          style={{
            background: uiTokens.surfaceInput,
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
            style={{ color: uiTokens.textPrimary }}
          />
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: uiTokens.surfaceChip, color: uiTokens.textMuted }}>
            ESC
          </span>
        </div>
      </div>

      {/* Only meaningful for idle browsing — hidden once you're searching. */}
      {!searching && (
        <div className="px-5 pb-3">
          <SegmentedControl
            flat
            fullWidth
            options={[
              { value: 'AFC', label: 'AFC' },
              { value: 'NFC', label: 'NFC' },
            ]}
            value={conference}
            onChange={(v) => setConference(v as Conference)}
          />
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
                  background: uiTokens.surfaceCard2,
                  border: `1px solid ${uiTokens.borderSubtle}`,
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
          <div className="px-5 py-6 text-center text-sm" style={{ color: uiTokens.textMuted }}>
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
                    background: uiTokens.surfaceCard2,
                    border: `1px solid ${uiTokens.borderSubtle}`,
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
