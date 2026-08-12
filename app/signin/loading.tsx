import { colors as uiTokens } from '@/components/ui/tokens';

// Route-level fallback for /signin (loading.md): Next.js wraps page.tsx in a
// Suspense boundary using this file. The sign-in page reads searchParams and
// awaits listTeams — without this, navigation blocks with no skeleton while
// those dynamic deps resolve. Mirrors the other loading.tsx files' low-fidelity
// skeleton pattern (animate-pulse, surfaceChip placeholders).
export default function Loading() {
  return (
    <div
      className="flex flex-col mx-auto w-full animate-pulse"
      style={{
        height: '100dvh',
        maxWidth: 720,
        overflow: 'hidden',
        background: uiTokens.bg,
      }}>
      <div
        className="px-5 pb-3"
        style={{ flex: '0 0 auto', paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <div className="flex items-center justify-between">
          <div
            className="rounded-full"
            style={{ width: 36, height: 36, background: uiTokens.surfaceChip }}
          />
          <div
            className="rounded-full"
            style={{ width: 140, height: 30, background: uiTokens.surfaceChip }}
          />
        </div>
        <div
          className="rounded-xl mt-6"
          style={{ width: 180, height: 34, background: uiTokens.surfaceChip }}
        />
      </div>

      <div
        className="px-5 flex-1 flex flex-col gap-4"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        }}>
        <div className="rounded-2xl" style={{ height: 46, background: uiTokens.surfaceChip }} />
        <div className="rounded-2xl" style={{ height: 46, background: uiTokens.surfaceChip }} />
        <div className="rounded-2xl" style={{ height: 46, background: uiTokens.surfaceChip }} />
      </div>
    </div>
  );
}
