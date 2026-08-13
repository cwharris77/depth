'use client';

import { colors as uiTokens, typeScale } from '@/components/ui/tokens';

// FTN charting (the nflverse pbp_participation dataset) is CC-BY-SA 4.0 — this
// one-line footer is the license-mandated attribution, the condition of surfacing
// formation data at all (see docs/nflverse.md). Shared by every surface that shows
// FTN formation data (the field view's footer and FormationsSheet) so the string
// lives in one place and future surfaces (defensive formations, a dedicated
// formations route) inherit it by importing this component instead of re-typing it.
// Callers pass positioning padding via className; the component itself is a
// shrink-proof flex item so it can never be squeezed out of a flex column.
export default function FTNAttribution({ className = '' }: { className?: string }) {
  return (
    <div
      className={`shrink-0 text-center ${className}`}
      style={{ color: uiTokens.textFaint, fontSize: typeScale.caption }}>
      Formation data © FTN Data (CC-BY-SA 4.0)
    </div>
  );
}
