import DepthMark from '@/components/DepthMark';
import { colors as uiTokens } from '@/components/ui/tokens';

// Route-level fallback for /compare (loading.md): Next.js prefetches and shows this
// immediately on navigation, wrapping page.tsx in a Suspense boundary. /team/[id] already
// gets this treatment (app/team/[id]/loading.tsx); /compare never did, which is why the
// route reads as "broken" on first load — the browser had nothing to paint until the
// dynamic hole (both rosters, see lib/roster-source.db.ts) fully resolved (see vault
// ticket "Compare page first fetch is extremely slow"). Mirrors CompareTable's mobile
// layout at low fidelity (no team colors known yet) so the swap-in doesn't jump the
// layout, same approach as the team page's skeleton.
export default function Loading() {
  return (
    <div
      className="relative px-4 animate-pulse"
      style={{
        minHeight: '100dvh',
        background: uiTokens.bg,
        paddingTop: 'max(env(safe-area-inset-top), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
      }}>
      <div className="mx-auto xl:max-w-2xl xl:pt-10">
        <div className="flex items-center justify-between xl:hidden">
          <DepthMark color={uiTokens.textMuted} />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: uiTokens.surfaceChip }}
          />
          <div>
            <div
              className="rounded-md"
              style={{ width: 160, height: 20, background: uiTokens.surfaceChip }}
            />
            <div
              className="mt-2 rounded-md"
              style={{ width: 220, height: 12, background: uiTokens.surfaceChip }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <div
            className="flex-1 rounded-2xl"
            style={{ height: 68, border: `1px dashed ${uiTokens.borderInput}` }}
          />
          <span
            className="shrink-0 rounded-full px-2 py-1 text-[10px] font-black"
            style={{ background: uiTokens.surfaceChip, color: uiTokens.textFaint }}
            aria-hidden="true">
            VS
          </span>
          <div
            className="flex-1 rounded-2xl"
            style={{ height: 68, border: `1px dashed ${uiTokens.borderInput}` }}
          />
        </div>

        <div
          className="mt-5 flex gap-1 rounded-2xl p-1"
          style={{ background: uiTokens.surfaceChip }}>
          <div
            className="h-8 flex-1 rounded-xl"
            style={{ background: uiTokens.surfaceChipHover }}
          />
          <div className="h-8 flex-1 rounded-xl" />
        </div>

        <div className="mt-5 flex items-center gap-2 overflow-hidden">
          {[64, 64, 64, 64, 64].map((w, i) => (
            <div
              key={i}
              className="shrink-0 rounded-full"
              style={{ width: w, height: 28, background: uiTokens.surfaceChip }}
            />
          ))}
        </div>

        <div
          className="mt-5 mb-6 flex flex-col items-center gap-3 rounded-2xl px-6 py-10"
          style={{
            border: `1px dashed ${uiTokens.borderSubtle}`,
            background: uiTokens.surfaceCard2,
          }}>
          <div
            className="rounded-full"
            style={{ width: 22, height: 22, background: uiTokens.surfaceChip }}
          />
          <div
            className="mt-1 rounded-md"
            style={{ width: 180, height: 14, background: uiTokens.surfaceChip }}
          />
          <div
            className="rounded-md"
            style={{ width: 220, height: 11, background: uiTokens.surfaceChip }}
          />
        </div>
      </div>
    </div>
  );
}
