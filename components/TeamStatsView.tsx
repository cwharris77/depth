'use client';

// Season-record view for the team stats page (docs/superpowers/specs/2026-07-14-
// multi-season-team-stats-design.md). A client component so the season switcher can hold
// local state; it receives one team's already-resolved data as a prop (invariant 5) —
// `seasons` is small (current + up to two prior years), never a fan-out of all-32 data.
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { TeamMeta } from '@/lib/roster-source';
import type { TeamStats } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import { ordinal } from '@/lib/format';

interface Props {
  team: TeamMeta;
  coach?: { name: string; experience: number };
  seasons: TeamStats[];
}

function wl(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <>
      <td className="py-[9px]" style={{ color: '#7d848c' }}>
        {label}
      </td>
      <td className="py-[9px] text-right font-bold" style={color ? { color } : undefined}>
        {value}
      </td>
    </>
  );
}

export default function TeamStatsView({ team, coach, seasons }: Props) {
  const [index, setIndex] = useState(0);
  const { uiAccent, primary } = team.colors;
  const tickerText = readableTextOn(primary);

  if (seasons.length === 0) {
    return (
      <div
        className="px-5 py-6"
        style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#fff' }}>
        <Link
          href={`/team/${team.id}`}
          className="inline-flex items-center gap-1.5 mb-6"
          style={{ color: uiAccent }}>
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">
            {team.city} {team.name}
          </span>
        </Link>
        <p className="text-sm" style={{ color: '#A5ACAF' }}>
          No stats available for this team yet.
        </p>
      </div>
    );
  }

  const active = seasons[Math.min(Math.max(index, 0), seasons.length - 1)];
  const record = active.overallTies
    ? `${active.overallWins}-${active.overallLosses}-${active.overallTies}`
    : `${active.overallWins}-${active.overallLosses}`;
  const diff = active.pointDifferential;
  const diffLabel = diff > 0 ? `+${diff}` : String(diff);
  const diffColor = diff > 0 ? uiAccent : diff < 0 ? '#ef5350' : '#A5ACAF';
  const gamesPlayed = active.overallWins + active.overallLosses + active.overallTies;

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#f0f4ff' }}>
      {/* Brand ticker strip — a large controlled surface (invariant 4), so it uses the
          brand-true primary with a computed contrast text rather than uiAccent. */}
      <div
        className="flex items-center justify-between px-4 py-3 text-sm font-bold tracking-[0.08em]"
        style={{
          background: primary,
          color: tickerText,
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
        }}>
        <Link
          href={`/team/${team.id}`}
          className="inline-flex items-center gap-1.5 no-underline"
          style={{ color: tickerText }}>
          <ArrowLeft size={18} />
          {team.abbrev}
        </Link>
        <span>SEASON STATS</span>
      </div>

      {/* Season switcher — no prev/next arrows: desktop is wide enough to show every
          season at once, and mobile relies on the horizontal swipe affordance. */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2.5 overflow-x-auto"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: '#0d1220',
          scrollbarWidth: 'none',
        }}>
        {[...seasons]
          .map((s, i) => ({ s, i }))
          .reverse()
          .map(({ s, i }) => {
            const isSelected = i === index;
            const isLatest = i === 0;
            return (
              <button
                key={s.season}
                type="button"
                onClick={() => setIndex(i)}
                className="shrink-0 flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-bold"
                style={{
                  background: isSelected ? uiAccent : 'transparent',
                  color: isSelected ? '#0a0e1a' : '#A5ACAF',
                  border: `1px solid ${isSelected ? uiAccent : 'rgba(255,255,255,0.15)'}`,
                }}>
                {isLatest && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: isSelected ? '#0a0e1a' : uiAccent }}
                  />
                )}
                {s.season}
              </button>
            );
          })}
      </div>

      {/* Team + coach — coach is not season-scoped (no cheap historical source). */}
      <div className="px-5 pt-[18px]">
        <div className="text-[11px] font-bold tracking-[0.1em]" style={{ color: '#7d848c' }}>
          {team.city.toUpperCase()} {team.name.toUpperCase()}
        </div>
        {coach && (
          <div className="mt-0.5 text-[11px]" style={{ color: '#A5ACAF' }}>
            HC {coach.name.toUpperCase()} · {ordinal(coach.experience).toUpperCase()} SEASON
          </div>
        )}
      </div>

      {/* Hero record */}
      <div
        className="mt-0.5 flex items-baseline justify-between px-5 pb-[18px] pt-2"
        style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }}>
        <div className="text-[52px] font-bold leading-none tracking-[-0.02em]">{record}</div>
        <div className="text-right">
          <div className="text-[13px] font-bold" style={{ color: uiAccent }}>
            {active.streak}
          </div>
          <div className="text-[11px]" style={{ color: '#7d848c' }}>
            {active.playoffSeed
              ? `SEED ${active.playoffSeed} · ${team.conference}`
              : `MISSED PLAYOFFS · ${team.conference}`}
          </div>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="px-5">
        <table className="mt-1.5 w-full border-collapse text-xs">
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <StatCell label="HOME" value={wl(active.homeWins, active.homeLosses)} />
              <td className="w-6" />
              <StatCell label="ROAD" value={wl(active.roadWins, active.roadLosses)} />
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <StatCell label="DIV" value={wl(active.divisionWins, active.divisionLosses)} />
              <td className="w-6" />
              <StatCell label="CONF" value={wl(active.conferenceWins, active.conferenceLosses)} />
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <StatCell label="PF" value={String(active.pointsFor)} />
              <td className="w-6" />
              <StatCell label="PA" value={String(active.pointsAgainst)} />
            </tr>
            <tr>
              <StatCell label="DIFF" value={diffLabel} color={diffColor} />
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer ticker */}
      <div
        className="px-5 pb-[22px] pt-3.5 text-[10px] tracking-[0.06em]"
        style={{ color: '#5a616a' }}>
        {active.season} SEASON · {gamesPlayed} GAMES PLAYED ▸▸▸
      </div>
    </div>
  );
}
