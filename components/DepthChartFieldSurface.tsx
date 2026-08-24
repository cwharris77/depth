'use client';

import { colors as uiTokens } from '@/components/ui/tokens';
import type { Player, RenderSlot, TeamColors, Unit } from '@/lib/types';
import FTNAttribution from './FTNAttribution';
import FieldMarkings from './FieldMarkings';
import PlayerDot from './PlayerDot';

type Props = {
  slots: RenderSlot[];
  activeUnit: Unit;
  activeColors: TeamColors;
  selectedPlayerId: string | undefined;
  onPlayerClick: (player: Player) => void;
  unitFormationsCount: number;
  historicalMode: boolean;
  historyLoading: boolean;
  historyNotFound: boolean;
  historyError: Error | null;
  season: number | null;
  teamName: string;
  onRetryHistory: () => void;
};

// The field itself: markings, special-teams group labels, the roster's dots, and the
// historical-fetch overlay states (loading/not-found/error). Extracted out of
// DepthChartField so that component composes sections rather than owning the field's
// JSX directly (DEP-179).
export default function DepthChartFieldSurface({
  slots,
  activeUnit,
  activeColors,
  selectedPlayerId,
  onPlayerClick,
  unitFormationsCount,
  historicalMode,
  historyLoading,
  historyNotFound,
  historyError,
  season,
  teamName,
  onRetryHistory,
}: Props) {
  return (
    <div
      className="px-3 flex flex-col xl:justify-center"
      style={{
        flex: '1 1 0',
        minHeight: 0,
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      }}>
      <div
        className="relative w-full rounded-2xl overflow-hidden xl:max-h-[min(640px,72dvh)]"
        style={{
          flex: '1 1 0',
          minHeight: 0,
          // Alternating darker/lighter green stripes — 10 horizontal bands give a
          // subtle yard-line-zone texture without cluttering with actual yard numbers.
          background: `repeating-linear-gradient(
            180deg,
            #1b3510 0%,
            #1b3510 10%,
            #224415 10%,
            #224415 20%
          )`,
          boxShadow: `inset 0 0 60px ${uiTokens.scrimLight}, 0 4px 32px ${uiTokens.scrim}`,
        }}>
        <FieldMarkings />

        {/* Zone labels — subtle, uppercase, left-aligned markers that give the
            pitch a tactical-board feel. Only shown on wider screens where they
            won't collide with player dots. */}
        <div
          className="absolute inset-0 pointer-events-none hidden lg:block"
          style={{ padding: '0 6px' }}>
          {[
            { label: 'RED ZONE', top: '5%' },
            { label: 'OWN 20', top: '18%' },
            { label: 'OPP 20', top: '78%' },
            { label: 'RED ZONE', top: '92%' },
          ].map((z) => (
            <div
              key={z.label}
              className="absolute font-semibold"
              style={{
                // Inboard of FieldMarkings' painted yard numbers (x≈3–7), which own
                // the sideline margin at lg+; MIDFIELD is gone entirely — the painted
                // 50 at midfield says it.
                left: 11,
                top: z.top,
                transform: 'translateY(-50%)',
                color: uiTokens.textFaint,
                letterSpacing: '0.08em',
                fontSize: 'clamp(5px, 0.9dvh, 7px)',
                opacity: 0.5,
              }}>
              {z.label}
            </div>
          ))}
        </div>

        {activeUnit === 'special' && (
          <>
            {/* Grouping labels for the two special-teams clusters — the slot
                coordinates (lib/espn/transform.ts) already cluster KR/PR above
                the LOS and LS/K/P below it, but with no label the split reads
                as arbitrary rather than a real formation. */}
            <div
              className="absolute font-semibold text-center pointer-events-none"
              style={{
                left: '50%',
                top: '8%',
                transform: 'translate(-50%, -50%)',
                color: uiTokens.textMuted,
                letterSpacing: '0.05em',
                fontSize: 'clamp(6px, 1.1dvh, 8px)',
              }}>
              RETURN UNIT
            </div>
            <div
              className="absolute font-semibold text-center pointer-events-none"
              style={{
                left: '50%',
                top: '58%',
                transform: 'translate(-50%, -50%)',
                color: uiTokens.textMuted,
                letterSpacing: '0.05em',
                fontSize: 'clamp(6px, 1.1dvh, 8px)',
              }}>
              KICKING UNIT
            </div>
          </>
        )}

        {slots.map((slot) => {
          const player = slot.player;
          if (!player) return null;
          return (
            <PlayerDot
              key={slot.key}
              player={player}
              slot={slot}
              isSelected={selectedPlayerId === player.id}
              onClick={onPlayerClick}
              teamPrimary={activeColors.primary}
              teamColors={activeColors}
              unit={activeUnit}
            />
          );
        })}

        {/* Historical fetch states: never render live dots in place of these (see
            fieldRoster in DepthChartField) so a wrong season's data can't flash before
            the real one lands, and a season with no ingested data reads as empty, not
            broken. */}
        {historicalMode && historyLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-bold" style={{ color: uiTokens.textMuted }}>
              Loading {season} season…
            </span>
          </div>
        )}
        {historicalMode && historyNotFound && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center pointer-events-none">
            <span className="text-xs font-bold" style={{ color: uiTokens.textMuted }}>
              No {season} roster data for the {teamName} yet.
            </span>
          </div>
        )}
        {historicalMode && historyError && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center pointer-events-none">
            <span className="text-xs font-bold" style={{ color: uiTokens.textMuted }}>
              Couldn't load {season} season data.
            </span>
            <button
              type="button"
              onClick={onRetryHistory}
              className="ml-2 text-xs font-bold underline pointer-events-auto"
              style={{ color: uiTokens.accent }}>
              Retry
            </button>
          </div>
        )}
      </div>

      {/* FTN Data is CC-BY-SA 4.0 -- attribution is the condition of surfacing it
          (docs/nflverse.md). Shown whenever the active unit has real-formation data
          on screen -- not only once a formation is picked, since the default pick
          is the team's top formation and the field renders FTN-sourced layouts
          from first paint. Historical seasons have no formation data, so none
          here. xl centers the capped field + attribution as a group (justify-center
          above); below xl the field still fills the leftover column height. */}
      {!historicalMode && unitFormationsCount > 0 && <FTNAttribution className="pt-1.5" />}
    </div>
  );
}
