import { colors as uiTokens } from '@/components/ui/tokens';

// Shared "UPCOMING" pill — used by TeamStatsView's season trigger/synthetic upcoming
// chip, and by TeamStatsSeasonSheet's rows for a season with no games played yet
// (either the synthetic upcoming entry, or a real team_stats row ingest landed early
// as a stub ahead of kickoff). Split out of TeamStatsView so TeamStatsSeasonSheet can
// reuse it without a circular import between the two.
export default function UpcomingBadge({
  selected,
  uiAccent,
}: {
  selected: boolean;
  uiAccent: string;
}) {
  return (
    <span
      className="inline-block rounded-full px-1.5 py-[1px] text-[8px] font-bold tracking-[0.04em]"
      style={{
        color: selected ? uiTokens.bg : uiAccent,
        background: selected ? `${uiTokens.bg}33` : `${uiAccent}1a`,
        border: `1px solid ${selected ? `${uiTokens.bg}55` : `${uiAccent}55`}`,
      }}>
      UPCOMING
    </span>
  );
}
